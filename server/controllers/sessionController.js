/*
  POMODORO SESSION CONTROLLER

    POST   /api/sessions/start          { subjectId?, taskId?, durationMinutes }
    PATCH  /api/sessions/:id/complete   { actualMinutes? }
    PATCH  /api/sessions/:id/abandon    { actualMinutes? }
    GET    /api/sessions/active         — current running session if any
    GET    /api/sessions/today          — today's completed sessions
    GET    /api/sessions/stats          — aggregates: today, week, per-subject
*/

const StudySession = require('../models/StudySession')
const Subject = require('../models/Subject')

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x }

exports.start = async (req, res) => {
  try {
    const { subjectId, taskId, durationMinutes } = req.body
    const minutes = Number(durationMinutes) || 25
    if (minutes < 1 || minutes > 240) {
      return res.status(400).json({ message: 'durationMinutes must be between 1 and 240' })
    }

    // Abandon any prior active session for this user (only one at a time)
    await StudySession.updateMany(
      { userId: req.user.id, status: 'active' },
      { status: 'abandoned', endedAt: new Date() }
    )

    const session = await StudySession.create({
      userId: req.user.id,
      subjectId: subjectId || null,
      taskId: taskId || null,
      durationMinutes: minutes,
    })

    res.status(201).json(session)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.complete = async (req, res) => {
  try {
    const session = await StudySession.findOne({ _id: req.params.id, userId: req.user.id })
    if (!session) return res.status(404).json({ message: 'Session not found' })
    if (session.status !== 'active') return res.json(session) // idempotent

    const elapsedSeconds = (Date.now() - new Date(session.startedAt).getTime()) / 1000
    const elapsedMinutes = Math.min(session.durationMinutes, Math.round(elapsedSeconds / 60))

    session.status = 'completed'
    session.endedAt = new Date()
    session.actualMinutes = req.body.actualMinutes ?? elapsedMinutes
    await session.save()
    res.json(session)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.abandon = async (req, res) => {
  try {
    const session = await StudySession.findOne({ _id: req.params.id, userId: req.user.id })
    if (!session) return res.status(404).json({ message: 'Session not found' })
    if (session.status !== 'active') return res.json(session)

    const elapsedSeconds = (Date.now() - new Date(session.startedAt).getTime()) / 1000
    const elapsedMinutes = Math.max(0, Math.round(elapsedSeconds / 60))

    session.status = 'abandoned'
    session.endedAt = new Date()
    session.actualMinutes = req.body.actualMinutes ?? elapsedMinutes
    await session.save()
    res.json(session)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.active = async (req, res) => {
  try {
    const s = await StudySession.findOne({ userId: req.user.id, status: 'active' })
      .populate('subjectId', 'name color')
      .populate('taskId', 'title')
    res.json(s || null)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.today = async (req, res) => {
  try {
    const today = startOfDay(new Date())
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const sessions = await StudySession.find({
      userId: req.user.id,
      status: 'completed',
      startedAt: { $gte: today, $lt: tomorrow },
    }).populate('subjectId', 'name color').sort({ startedAt: -1 })
    res.json(sessions)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.stats = async (req, res) => {
  try {
    const today = startOfDay(new Date())
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6)

    const sessions = await StudySession.find({
      userId: req.user.id,
      status: 'completed',
      startedAt: { $gte: weekStart },
    }).populate('subjectId', 'name color')

    const todayMinutes = sessions
      .filter(s => new Date(s.startedAt) >= today)
      .reduce((sum, s) => sum + (s.actualMinutes || 0), 0)

    const weekMinutes = sessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0)

    // by-day (last 7 days)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const m = sessions
        .filter(s => new Date(s.startedAt) >= d && new Date(s.startedAt) < next)
        .reduce((sum, s) => sum + (s.actualMinutes || 0), 0)
      days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        iso: d.toISOString().split('T')[0],
        minutes: m,
        hours: +(m / 60).toFixed(2),
      })
    }

    // by-subject (today)
    const todayBySubject = new Map()
    for (const s of sessions) {
      if (new Date(s.startedAt) < today) continue
      const id = s.subjectId?._id?.toString() || 'unsorted'
      const entry = todayBySubject.get(id) || {
        subjectId: id,
        name:  s.subjectId?.name  || 'Unsorted',
        color: s.subjectId?.color || '#9CA3AF',
        minutes: 0,
      }
      entry.minutes += s.actualMinutes || 0
      todayBySubject.set(id, entry)
    }

    res.json({
      todayMinutes,
      weekMinutes,
      sessionCountToday: sessions.filter(s => new Date(s.startedAt) >= today).length,
      sessionCountWeek:  sessions.length,
      days,
      todayBySubject: Array.from(todayBySubject.values()).sort((a, b) => b.minutes - a.minutes),
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
}
