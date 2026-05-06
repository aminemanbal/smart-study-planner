/*
  STUDY PLAN GENERATION
  =====================
  Two strategies, same return contract:

    generatePlan(userId)    — fast, deterministic, rule-based.
                              difficulty + priority => sessions/day.
    generateAIPlan(userId)  — Claude-powered. Reads subjects, exams,
                              and past performance, returns specific tasks
                              ("Review chapter 3: derivatives") instead of
                              generic "Session 1" labels.

  Both wipe existing pending tasks before regenerating; done/missed
  history is preserved for progress tracking.
*/

const Exam = require('../models/Exam')
const Task = require('../models/Task')
const aiService = require('./aiService')

const DIFFICULTY_SCORE = { easy: 1, medium: 2, hard: 3 }
const PRIORITY_SCORE   = { low: 1, medium: 2, high: 3 }

const sessionsFromScore = (score) => {
  if (score >= 6) return 3
  if (score === 5) return 2
  return 1
}

/* -------- RULE-BASED -------- */

const generatePlan = async (userId) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const exams = await Exam.find({
    userId,
    examDate: { $gte: today }
  }).populate('subjectId')

  if (!exams.length) return []

  await Task.deleteMany({ userId, status: 'pending' })

  const tasks = []

  for (const exam of exams) {
    const subject = exam.subjectId
    if (!subject) continue

    const examDate = new Date(exam.examDate)
    examDate.setHours(0, 0, 0, 0)

    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) continue

    const difficulty = DIFFICULTY_SCORE[subject.difficultyLevel] || 2
    const priority = PRIORITY_SCORE[exam.priority] || 2
    const score = difficulty + priority

    const sessionsPerDay = sessionsFromScore(score)
    const isUrgent = daysLeft < 3

    for (let i = 0; i < daysLeft; i++) {
      const taskDate = new Date(today)
      taskDate.setDate(today.getDate() + i)
      if (taskDate >= examDate) break

      for (let s = 0; s < sessionsPerDay; s++) {
        const label = isUrgent
          ? `Urgent revision — ${subject.name} (Session ${s + 1})`
          : `Study — ${subject.name} (Session ${s + 1})`

        tasks.push({
          userId,
          subjectId: subject._id,
          title: label,
          date: new Date(taskDate),
          status: 'pending',
          source: 'rule',
          estimatedMinutes: isUrgent ? 60 : 45,
        })
      }
    }
  }

  if (tasks.length > 0) await Task.insertMany(tasks)
  return tasks
}

/* -------- AI-POWERED -------- */

const Subject = require('../models/Subject')

const generateAIPlan = async (userId) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [subjects, exams, allTasks] = await Promise.all([
    Subject.find({ userId }),
    Exam.find({ userId, examDate: { $gte: today } }).populate('subjectId'),
    Task.find({ userId }),
  ])

  if (!exams.length) {
    return { tasks: [], rationale: 'No upcoming exams — nothing to plan.' }
  }

  const completed = allTasks.filter(t => t.status === 'done').length
  const missed    = allTasks.filter(t => t.status === 'missed').length
  const total     = allTasks.length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const ai = await aiService.generateAIStudyPlan({
    subjects,
    exams,
    history: { completed, missed, total, completionRate },
    today,
  })

  // Validate subjectIds returned by the AI map to real subjects of this user.
  const validSubjectIds = new Set(subjects.map(s => s._id.toString()))

  const taskDocs = ai.tasks
    .filter(t => validSubjectIds.has(t.subjectId))
    .map(t => ({
      userId,
      subjectId: t.subjectId,
      title: t.title,
      date: new Date(t.date + 'T00:00:00'),
      status: 'pending',
      source: 'ai',
      estimatedMinutes: Math.max(15, Math.min(120, t.estimatedMinutes || 45)),
    }))

  await Task.deleteMany({ userId, status: 'pending' })
  if (taskDocs.length > 0) await Task.insertMany(taskDocs)

  return { tasks: taskDocs, rationale: ai.rationale }
}

module.exports = { generatePlan, generateAIPlan }
