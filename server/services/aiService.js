/*
  AI SERVICE — wraps the Groq API for the Smart Study Planner.

  Three capabilities are layered on top of one shared client:
    1. generateAIStudyPlan(...)  — replaces the rule-based planner with an
       LLM that reasons about workload, deadlines, and past performance.
    2. getAIInsights(...)        — produces 2-4 short, data-driven coaching
       tips for the dashboard.
    3. chatStream(...)           — streaming, tool-using study coach.

  Why Groq + Llama 3.3 70B
  ------------------------
  - Real free tier (no credit card required to start).
  - OpenAI-compatible API, so we use the standard `openai` SDK and just
    point baseURL at Groq. Swap providers later by changing two lines.
  - Llama 3.3 70B is smart enough for planning + tool-use + JSON output.
  - Sub-second latency on most calls — feels much more responsive than
    a typical hosted model in a chat UI.

  To switch back to OpenAI / OpenRouter / Mistral: change BASE_URL + MODEL.
*/

const OpenAI = require('openai')

const BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
const MODEL    = process.env.GROQ_MODEL    || 'llama-3.3-70b-versatile'

let _client = null
const getClient = () => {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error(
      'GROQ_API_KEY is not set. Add it to server/.env (see .env.example). ' +
      'Get a free key at https://console.groq.com/keys'
    )
    err.code = 'MISSING_API_KEY'
    throw err
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: BASE_URL,
    })
  }
  return _client
}

/* ------------------------------------------------------------------ */
/* 1. AI STUDY PLAN GENERATION                                         */
/* ------------------------------------------------------------------ */

const PLAN_SYSTEM = `You are an expert academic study coach.
Your job: turn a student's exam schedule into a concrete, day-by-day study plan
they can actually follow.

PRINCIPLES
- Closer exam date + higher priority + harder subject => more frequent and longer sessions.
- Distribute work evenly. Avoid cramming in the last 2 days unless unavoidable.
- Vary task titles. Use real study verbs ("Review", "Practice", "Drill", "Solve",
  "Re-read", "Summarise") and reference concrete content (chapter, topic, problem set).
- Each session is 25–90 minutes typically. Never less than 15, never more than 120.
- Prefer 1–3 sessions per day per student total — do not flood any day.
- If the student has a high miss rate, schedule slightly fewer sessions and add easy wins.

OUTPUT FORMAT — return ONLY a single JSON object with this exact shape:
{
  "tasks": [
    {
      "subjectId":        string,   // copy verbatim from the input subjects[].subjectId
      "title":            string,   // specific study task ("Review chapter 3: derivatives")
      "date":             string,   // ISO date YYYY-MM-DD
      "estimatedMinutes": integer   // 15..120
    }
  ],
  "rationale": string               // one short paragraph explaining the distribution
}

Do not include any prose outside the JSON. Do not invent subjectIds.`

async function generateAIStudyPlan({ subjects, exams, history, today }) {
  const client = getClient()

  const userPayload = {
    today: today.toISOString().split('T')[0],
    subjects: subjects.map(s => ({
      subjectId:       s._id.toString(),
      name:            s.name,
      difficultyLevel: s.difficultyLevel,
    })),
    exams: exams.map(e => ({
      subjectId:   e.subjectId._id.toString(),
      subjectName: e.subjectId.name,
      examDate:    new Date(e.examDate).toISOString().split('T')[0],
      priority:    e.priority,
      notes:       e.notes || '',
    })),
    history: {
      completedTasks: history.completed,
      missedTasks:    history.missed,
      totalTasks:     history.total,
      completionRate: history.completionRate,
    },
  }

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    max_completion_tokens: 8000,
    temperature: 0.4,
    messages: [
      { role: 'system', content: PLAN_SYSTEM },
      { role: 'user',   content: `Generate a study plan from this JSON data:\n\n${JSON.stringify(userPayload, null, 2)}` },
    ],
  })

  const text = completion.choices[0]?.message?.content
  if (!text) throw new Error('AI returned empty response')

  let parsed
  try { parsed = JSON.parse(text) }
  catch (e) { throw new Error('AI returned malformed JSON: ' + e.message) }

  if (!Array.isArray(parsed.tasks)) {
    throw new Error('AI response missing required "tasks" array')
  }

  return {
    tasks: parsed.tasks,
    rationale: parsed.rationale || '',
    usage: completion.usage,
  }
}

/* ------------------------------------------------------------------ */
/* 2. SMART SUGGESTIONS                                                */
/* ------------------------------------------------------------------ */

const INSIGHTS_SYSTEM = `You are a friendly, brief study coach.
Given a JSON snapshot of a student's planner, return 2-4 actionable observations.

Tone mapping (pick the tone that fits best):
  - "warn"    : approaching deadlines, stretched workload
  - "danger"  : high miss rate, falling behind
  - "success" : strong streak, high completion
  - "info"    : neutral nudge, helpful reminder

Each suggestion is one sentence (≤140 chars), specific to THIS data.
Do not invent numbers — use the ones provided.

OUTPUT FORMAT — return ONLY a single JSON object with this exact shape:
{
  "suggestions": [
    { "tone": "info" | "warn" | "danger" | "success", "text": string }
  ]
}

Do not include any prose outside the JSON. Provide 2 to 4 suggestions.`

async function getAIInsights({ subjects, exams, summary, today }) {
  const client = getClient()

  const upcoming = exams
    .filter(e => new Date(e.examDate) >= today)
    .map(e => ({
      subject:  e.subjectId?.name,
      examDate: new Date(e.examDate).toISOString().split('T')[0],
      priority: e.priority,
      daysLeft: Math.max(0, Math.ceil((new Date(e.examDate) - today) / 86400000)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const payload = {
    today: today.toISOString().split('T')[0],
    subjectCount: subjects.length,
    upcomingExams: upcoming.slice(0, 6),
    progress: {
      overall:         summary.overall,
      completedTasks:  summary.completed,
      missedTasks:     summary.missed,
      totalTasks:      summary.total,
      activeDaysLast7: summary.studiedDays,
    },
  }

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    max_completion_tokens: 800,
    temperature: 0.6,
    messages: [
      { role: 'system', content: INSIGHTS_SYSTEM },
      { role: 'user',   content: `Snapshot JSON:\n\n${JSON.stringify(payload, null, 2)}` },
    ],
  })

  const text = completion.choices[0]?.message?.content
  if (!text) throw new Error('AI returned empty response')
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.suggestions)) {
    throw new Error('AI response missing "suggestions" array')
  }
  // Defensive normalisation
  return parsed.suggestions
    .filter(s => s && typeof s.text === 'string')
    .slice(0, 4)
    .map(s => ({
      tone: ['info', 'warn', 'danger', 'success'].includes(s.tone) ? s.tone : 'info',
      text: s.text.trim().slice(0, 200),
    }))
}

/* ------------------------------------------------------------------ */
/* 3. CHAT — streaming with tool use                                   */
/* ------------------------------------------------------------------ */

const CHAT_SYSTEM = `You are "Pulse", the in-app study coach for the Smart Study Planner.

You help the student plan, reflect, and stay on track. You can read their data
and update their plan via tools — call them whenever you need fresh facts;
do NOT invent numbers, task titles, or exam dates.

STYLE
- Warm, concise, energetic. 2-4 sentences max per reply unless they ask for more.
- Use short bullet lists when listing tasks.
- When you call a tool, briefly tell the user what you're checking, then act.
- Never expose database IDs to the user. Refer to subjects and tasks by name.

TOOLS
- get_today_tasks       — what is on the student's plate today.
- get_upcoming_exams    — exams in the next N days, with priority and countdown.
- get_progress_summary  — overall + per-subject completion stats.
- get_subjects          — the student's subjects with difficulty levels.
- mark_task_done        — only when the student explicitly asks you to.
- regenerate_study_plan — only with explicit confirmation; this wipes pending tasks.

If the student asks something unrelated to studying, gently redirect.`

const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_today_tasks',
      description: "Return all tasks scheduled for today, with subject name and status.",
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_exams',
      description: 'Return exams scheduled within the next N days (default 14).',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Lookahead window in days (1-60).' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_progress_summary',
      description: 'Return overall completion rate, missed count, active days, and per-subject completion.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_subjects',
      description: "Return all subjects with their difficulty levels.",
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_task_done',
      description: 'Mark a single pending task as done. Use the task title (and optionally subject) to identify it.',
      parameters: {
        type: 'object',
        properties: {
          title:   { type: 'string', description: 'Exact task title as shown to the user.' },
          subject: { type: 'string', description: 'Subject name (optional, for disambiguation).' },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'regenerate_study_plan',
      description: 'Wipe pending tasks and produce a fresh AI-generated plan from current subjects/exams. Use only when the user explicitly asks.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
]

/**
 * Run a streaming chat turn. Drives the agentic loop and writes SSE events to `res`.
 *
 * @param {object}   args
 * @param {Array}    args.messages     Conversation history [{role, content}]
 * @param {Function} args.executeTool  async (name, input) => any
 * @param {object}   args.res          Express response (already SSE-headed)
 */
async function chatStream({ messages, executeTool, res }) {
  const client = getClient()

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Build the OpenAI-format conversation. Frontend only sends user/assistant
  // text turns; we prepend the system prompt and inject tool messages
  // server-side as the loop progresses.
  const convo = [
    { role: 'system', content: CHAT_SYSTEM },
    ...messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  ]

  // Hard ceiling on tool-use rounds to prevent runaway loops.
  for (let round = 0; round < 8; round++) {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: convo,
      tools: CHAT_TOOLS,
      tool_choice: 'auto',
      stream: true,
      max_completion_tokens: 2048,
      temperature: 0.6,
    })

    let fullContent = ''
    const toolAccum = {} // index -> { id, function: { name, arguments } }
    let finishReason = null

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if (!choice) continue
      const delta = choice.delta || {}

      if (delta.content) {
        fullContent += delta.content
        send({ type: 'text', delta: delta.content })
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolAccum[idx]) {
            toolAccum[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } }
          }
          if (tc.id) toolAccum[idx].id = tc.id
          if (tc.function?.name) toolAccum[idx].function.name += tc.function.name
          if (tc.function?.arguments) toolAccum[idx].function.arguments += tc.function.arguments
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason
    }

    const toolCalls = Object.values(toolAccum).filter(tc => tc.function.name)

    // Append the assistant turn (with tool_calls metadata if any).
    if (toolCalls.length > 0) {
      convo.push({
        role: 'assistant',
        content: fullContent || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments || '{}' },
        })),
      })
    } else if (fullContent) {
      convo.push({ role: 'assistant', content: fullContent })
    }

    // No tool calls => we're done.
    if (toolCalls.length === 0 || finishReason === 'stop') {
      send({ type: 'done' })
      return
    }

    // Execute every tool call and append the results.
    for (const tc of toolCalls) {
      const name = tc.function.name
      let input = {}
      try { input = JSON.parse(tc.function.arguments || '{}') } catch { /* keep {} */ }

      send({ type: 'tool_use', name, input })

      let resultPayload, isError = false
      try {
        resultPayload = await executeTool(name, input)
      } catch (err) {
        resultPayload = { error: err.message }
        isError = true
      }
      send({ type: 'tool_result', name, isError })

      convo.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(resultPayload),
      })
    }
  }

  send({ type: 'error', message: 'Maximum tool-use rounds exceeded.' })
}

module.exports = {
  generateAIStudyPlan,
  getAIInsights,
  chatStream,
  MODEL,
}
