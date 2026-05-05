/*
  STUDY PLAN GENERATION ALGORITHM
  ================================
  INPUT  : userId
  OUTPUT : Task documents inserted into the database

  STEPS:
    1. Fetch all upcoming exams for the user (examDate >= today).
    2. For each exam, compute remainingDays = examDate - today.
    3. Compute a workload score per exam based on:
         - subject difficulty (easy=1, medium=2, hard=3)
         - exam priority   (low=1, medium=2, high=3)
         score = difficulty + priority   (range: 2..6)
    4. Derive sessions/day from the score:
         score <= 4  -> 1 session per day
         score == 5  -> 2 sessions per day
         score >= 6  -> 3 sessions per day
    5. EDGE CASES:
         - No upcoming exams        -> return [] (nothing to plan)
         - daysLeft <= 0            -> skip exam (already past)
         - daysLeft < 3             -> "urgent revision" label, full sessions/day
         - subject has no exam      -> not scheduled (algorithm is exam-driven)
         - overlapping exams        -> tasks for both subjects coexist on same day
    6. Pending tasks are wiped before regeneration so the user always
       receives a clean schedule. Done / missed tasks are preserved
       for progress tracking.
    7. Persist generated tasks via Task.insertMany().
*/

const Exam = require('../models/Exam')
const Task = require('../models/Task')

const DIFFICULTY_SCORE = { easy: 1, medium: 2, hard: 3 }
const PRIORITY_SCORE   = { low: 1, medium: 2, high: 3 }

const sessionsFromScore = (score) => {
  if (score >= 6) return 3
  if (score === 5) return 2
  return 1
}

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
          status: 'pending'
        })
      }
    }
  }

  if (tasks.length > 0) {
    await Task.insertMany(tasks)
  }

  return tasks
}

module.exports = { generatePlan }
