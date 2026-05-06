/*
  AI CONTROLLER

    POST /api/ai/plan/generate  — Claude generates concrete study tasks.
    GET  /api/ai/insights       — Claude returns 2-4 dashboard tips.
    POST /api/ai/chat           — Streaming SSE chat with tool calling.

  All routes require auth. The chat endpoint expects:
      { messages: [{role:'user'|'assistant', content:'...' | content blocks}] }
  and returns text/event-stream of events:
      {type:'text', delta}            — token chunks
      {type:'tool_use', name, input}  — agent invoked a tool
      {type:'tool_result', name, isError}
      {type:'done', usage?}
      {type:'error', message}
*/

const aiService = require('../services/aiService')
const planner = require('../services/plannerService')
const Task = require('../models/Task')
const Subject = require('../models/Subject')
const Exam = require('../models/Exam')

const handle = (err, res) => {
  if (err.code === 'MISSING_API_KEY') {
    return res.status(503).json({ message: err.message })
  }
  // SDK errors usually carry a status
  const status = err.status || 500
  return res.status(status).json({ message: err.message || 'AI request failed' })
}

/* ---------------- PLAN GENERATION ---------------- */

exports.generatePlan = async (req, res) => {
  try {
    const result = await planner.generateAIPlan(req.user.id)
    res.json({
      message: `${result.tasks.length} AI-generated tasks created`,
      tasks: result.tasks,
      rationale: result.rationale,
    })
  } catch (err) {
    handle(err, res)
  }
}

/* ---------------- INSIGHTS / SUGGESTIONS ---------------- */

exports.insights = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [subjects, exams, tasks] = await Promise.all([
      Subject.find({ userId: req.user.id }),
      Exam.find({ userId: req.user.id }).populate('subjectId', 'name'),
      Task.find({ userId: req.user.id }),
    ])

    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'done').length
    const missed = tasks.filter(t => t.status === 'missed').length
    const overall = total > 0 ? Math.round((completed / total) * 100) : 0

    // active days in last 7
    const last7Set = new Set()
    for (const t of tasks) {
      if (t.status !== 'done') continue
      const d = new Date(t.date)
      const diff = (today - new Date(d.setHours(0,0,0,0))) / 86400000
      if (diff >= 0 && diff < 7) last7Set.add(d.toDateString())
    }

    const summary = {
      total, completed, missed, overall,
      studiedDays: last7Set.size,
    }

    const suggestions = await aiService.getAIInsights({ subjects, exams, summary, today })
    res.json({ suggestions, summary })
  } catch (err) {
    handle(err, res)
  }
}

/* ---------------- CHAT (streaming SSE with tool use) ---------------- */

const days = (date, today) => Math.ceil((new Date(date) - today) / 86400000)

const buildToolExecutor = (userId) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return async (name, input) => {
    switch (name) {
      case 'get_today_tasks': {
        const tasks = await Task.find({ userId })
          .populate('subjectId', 'name color')
          .sort({ date: 1 })
        const todayStr = today.toDateString()
        return tasks
          .filter(t => new Date(t.date).toDateString() === todayStr)
          .map(t => ({
            title:    t.title,
            subject:  t.subjectId?.name,
            status:   t.status,
            estimatedMinutes: t.estimatedMinutes,
          }))
      }

      case 'get_upcoming_exams': {
        const window = Math.min(60, Math.max(1, input?.days || 14))
        const cutoff = new Date(today); cutoff.setDate(today.getDate() + window)
        const exams = await Exam.find({
          userId,
          examDate: { $gte: today, $lte: cutoff },
        }).populate('subjectId', 'name').sort({ examDate: 1 })
        return exams.map(e => ({
          subject:  e.subjectId?.name,
          examDate: new Date(e.examDate).toISOString().split('T')[0],
          priority: e.priority,
          daysLeft: days(e.examDate, today),
        }))
      }

      case 'get_progress_summary': {
        const [subjects, tasks] = await Promise.all([
          Subject.find({ userId }),
          Task.find({ userId }),
        ])
        const total = tasks.length
        const completed = tasks.filter(t => t.status === 'done').length
        const missed = tasks.filter(t => t.status === 'missed').length
        const overall = total > 0 ? Math.round((completed / total) * 100) : 0
        const perSubject = subjects.map(s => {
          const sTasks = tasks.filter(t => t.subjectId?.toString() === s._id.toString())
          const sDone = sTasks.filter(t => t.status === 'done').length
          return {
            subject: s.name,
            completed: sDone,
            total: sTasks.length,
            completionRate: sTasks.length ? Math.round(sDone / sTasks.length * 100) : 0,
          }
        })
        return { overall, completed, missed, total, perSubject }
      }

      case 'get_subjects': {
        const subjects = await Subject.find({ userId })
        return subjects.map(s => ({ name: s.name, difficulty: s.difficultyLevel }))
      }

      case 'mark_task_done': {
        if (!input?.title) throw new Error('title is required')
        // Find the most recent pending task matching the title (and subject if given)
        const filter = { userId, status: 'pending', title: input.title }
        let task = await Task.findOne(filter).populate('subjectId', 'name')
        if (!task && input.subject) {
          // fallback: case-insensitive partial title match within subject
          const subj = await Subject.findOne({
            userId,
            name: new RegExp(`^${input.subject}$`, 'i'),
          })
          if (subj) {
            task = await Task.findOne({
              userId, status: 'pending', subjectId: subj._id,
              title: new RegExp(input.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
            }).populate('subjectId', 'name')
          }
        }
        if (!task) return { success: false, message: 'No matching pending task found.' }
        task.status = 'done'
        await task.save()
        return { success: true, marked: { title: task.title, subject: task.subjectId?.name } }
      }

      case 'regenerate_study_plan': {
        const result = await planner.generateAIPlan(userId)
        return {
          success: true,
          taskCount: result.tasks.length,
          rationale: result.rationale,
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }
}

exports.chat = async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : []
    if (incoming.length === 0) {
      return res.status(400).json({ message: 'messages array is required' })
    }

    // Sanity: drop any messages with empty content
    const messages = incoming
      .filter(m => m && (typeof m.content === 'string' ? m.content.trim() : Array.isArray(m.content) && m.content.length > 0))
      .map(m => ({ role: m.role, content: m.content }))

    if (messages.length === 0) {
      return res.status(400).json({ message: 'no usable messages provided' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()

    const executeTool = buildToolExecutor(req.user.id)

    try {
      await aiService.chatStream({ messages, executeTool, res })
    } catch (err) {
      const payload = err.code === 'MISSING_API_KEY'
        ? { type: 'error', message: err.message }
        : { type: 'error', message: err.message || 'Chat failed' }
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    } finally {
      res.end()
    }
  } catch (err) {
    handle(err, res)
  }
}
