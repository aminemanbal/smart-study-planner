/*
  STUDY PLAN GENERATION ALGORITHM
  ================================
  1. Fetch all upcoming exams for the user
  2. For each exam, calculate remaining days
  3. Rank subjects by priority + difficulty score
  4. Distribute study sessions proportionally
  5. Handle edge cases (< 3 days, no exam, overlapping)
  6. Insert Task documents into database
*/

const Exam = require('../models/Exam')
const Subject = require('../models/Subject')
const Task = require('../models/Task')

const DIFFICULTY_SCORE = { easy: 1, medium: 2, hard: 3 }
const PRIORITY_SCORE   = { low: 1, medium: 2, high: 3 }

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

    const score = DIFFICULTY_SCORE[subject.difficultyLevel] + PRIORITY_SCORE[exam.priority]

    let sessionsPerDay = 1
    if (score >= 5) sessionsPerDay = 2
    if (score >= 6) sessionsPerDay = 3

    const totalDays = Math.min(daysLeft, daysLeft < 3 ? daysLeft : daysLeft)

    for (let i = 0; i < totalDays; i++) {
      const taskDate = new Date(today)
      taskDate.setDate(today.getDate() + i)

      if (taskDate >= examDate) break

      for (let s = 0; s < sessionsPerDay; s++) {
        const sessionLabel = daysLeft < 3
          ? `Révision urgente — ${subject.name} (Session ${s + 1})`
          : `Révision — ${subject.name} (Session ${s + 1})`

        tasks.push({
          userId,
          subjectId: subject._id,
          title: sessionLabel,
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