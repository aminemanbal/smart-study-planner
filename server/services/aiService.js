/*
  AI SERVICE — wraps the Anthropic SDK for the Smart Study Planner.

  Three capabilities are layered on top of one shared client:
    1. generateAIStudyPlan(userId)  — replaces the rule-based planner with an
       LLM that reasons about workload, deadlines, and past performance.
    2. getAIInsights(userId)        — produces 3 short, data-driven coaching
       tips for the dashboard.
    3. chatStream(...)              — streaming, tool-using study coach.

  Defaults (per the claude-api skill):
    - Model:     claude-opus-4-7
    - Thinking:  adaptive (no temperature/top_p/budget_tokens on Opus 4.7)
    - Streaming: used on long outputs (chat) to avoid HTTP timeouts
    - Caching:   cache_control on stable system prompts so multi-turn chats
                 reuse the prefix on every reply
*/

const Anthropic = require('@anthropic-ai/sdk')

const MODEL = 'claude-opus-4-7'

let _client = null
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error(
      'ANTHROPIC_API_KEY is not set. Add it to server/.env (see .env.example).'
    )
    err.code = 'MISSING_API_KEY'
    throw err
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/* ------------------------------------------------------------------ */
/* 1. AI STUDY PLAN GENERATION                                         */
/* ------------------------------------------------------------------ */

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      description: 'Daily study sessions distributed up to each exam date.',
      items: {
        type: 'object',
        properties: {
          subjectId:        { type: 'string', description: 'MongoDB ObjectId (string) of the subject — copy verbatim from the input.' },
          title:            { type: 'string', description: 'Specific study task. Mention concrete topics — not "Session 1".' },
          date:             { type: 'string', description: 'ISO date YYYY-MM-DD on which the task should be done.' },
          estimatedMinutes: { type: 'integer', description: 'Estimated minutes to spend (15–120).' },
        },
        required: ['subjectId', 'title', 'date', 'estimatedMinutes'],
        additionalProperties: false,
      },
    },
    rationale: {
      type: 'string',
      description: 'One short paragraph explaining why this distribution makes sense.',
    },
  },
  required: ['tasks', 'rationale'],
  additionalProperties: false,
}

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
- Output MUST conform exactly to the JSON schema. No prose outside JSON.`

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
      subjectId: e.subjectId._id.toString(),
      subjectName: e.subjectId.name,
      examDate:  new Date(e.examDate).toISOString().split('T')[0],
      priority:  e.priority,
      notes:     e.notes || '',
    })),
    history: {
      completedTasks: history.completed,
      missedTasks:    history.missed,
      totalTasks:     history.total,
      completionRate: history.completionRate,
    },
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: PLAN_SCHEMA },
    },
    system: [{ type: 'text', text: PLAN_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Generate a study plan from this data:\n\n${JSON.stringify(userPayload, null, 2)}`,
    }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock) throw new Error('AI returned no text block')

  const parsed = JSON.parse(textBlock.text)
  return {
    tasks: parsed.tasks,
    rationale: parsed.rationale,
    usage: response.usage,
  }
}

/* ------------------------------------------------------------------ */
/* 2. SMART SUGGESTIONS                                                */
/* ------------------------------------------------------------------ */

const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          tone:    { type: 'string', enum: ['info', 'warn', 'danger', 'success'] },
          text:    { type: 'string', description: 'One sentence, friendly, max 140 chars.' },
        },
        required: ['tone', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
}

const INSIGHTS_SYSTEM = `You are a friendly, brief study coach.
Given a snapshot of a student's planner, return 2-4 actionable observations.

Tone mapping (pick the tone that fits best):
  - "warn"    : approaching deadlines, stretched workload
  - "danger"  : high miss rate, falling behind
  - "success" : strong streak, high completion
  - "info"    : neutral nudge, helpful reminder

Each suggestion is one sentence (≤140 chars), specific to THIS data.
Do not invent numbers — use the ones provided.
Output MUST conform exactly to the JSON schema. No prose outside JSON.`

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
      overall:        summary.overall,
      completedTasks: summary.completed,
      missedTasks:    summary.missed,
      totalTasks:     summary.total,
      activeDaysLast7: summary.studiedDays,
    },
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: {
      format: { type: 'json_schema', schema: INSIGHTS_SCHEMA },
    },
    system: [{ type: 'text', text: INSIGHTS_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Snapshot:\n\n${JSON.stringify(payload, null, 2)}`,
    }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock) throw new Error('AI returned no text block')
  const parsed = JSON.parse(textBlock.text)
  return parsed.suggestions
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
    name: 'get_today_tasks',
    description: 'Return all tasks scheduled for today, with subject name and status.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_upcoming_exams',
    description: 'Return exams scheduled within the next N days (default 14).',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'integer', description: 'Lookahead window in days (1–60).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_progress_summary',
    description: 'Return overall completion rate, missed count, active days, and per-subject completion.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_subjects',
    description: 'Return all subjects with their difficulty levels.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'mark_task_done',
    description: 'Mark a single pending task as done. Use the task title (and optionally subject) to identify it; the backend will resolve to an ID.',
    input_schema: {
      type: 'object',
      properties: {
        title:   { type: 'string', description: 'Exact task title as shown to the user.' },
        subject: { type: 'string', description: 'Subject name (optional, for disambiguation).' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'regenerate_study_plan',
    description: 'Wipe pending tasks and produce a fresh AI-generated plan from current subjects/exams. Use only when the user explicitly asks.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
]

/**
 * Run a streaming chat turn. Drives the agentic loop and writes SSE events to `res`.
 *
 * @param {object}  args
 * @param {Array}   args.messages       Conversation history [{role, content}]
 * @param {Function} args.executeTool   async (name, input) => any
 * @param {object}  args.res            Express response (already SSE-headed)
 */
async function chatStream({ messages, executeTool, res }) {
  const client = getClient()

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Defensive copy — we mutate inside the loop
  const convo = messages.map(m => ({ ...m }))

  // Hard ceiling on tool-use rounds to prevent runaway loops
  for (let round = 0; round < 8; round++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: [{ type: 'text', text: CHAT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: CHAT_TOOLS,
      messages: convo,
    })

    stream.on('text', (delta) => send({ type: 'text', delta }))

    const finalMessage = await stream.finalMessage()

    // Append the assistant turn to the history so tool_results can reference it
    convo.push({ role: 'assistant', content: finalMessage.content })

    if (finalMessage.stop_reason === 'end_turn') {
      send({ type: 'done', usage: finalMessage.usage })
      return
    }

    if (finalMessage.stop_reason !== 'tool_use') {
      send({ type: 'done', usage: finalMessage.usage, stop_reason: finalMessage.stop_reason })
      return
    }

    const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use')
    if (toolUseBlocks.length === 0) {
      send({ type: 'done' })
      return
    }

    const toolResults = []
    for (const tu of toolUseBlocks) {
      send({ type: 'tool_use', name: tu.name, input: tu.input })
      let resultPayload, isError = false
      try {
        resultPayload = await executeTool(tu.name, tu.input)
      } catch (err) {
        resultPayload = { error: err.message }
        isError = true
      }
      send({ type: 'tool_result', name: tu.name, isError })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(resultPayload),
        is_error: isError,
      })
    }

    convo.push({ role: 'user', content: toolResults })
  }

  send({ type: 'error', message: 'Maximum tool-use rounds exceeded.' })
}

module.exports = {
  generateAIStudyPlan,
  getAIInsights,
  chatStream,
  MODEL,
}
