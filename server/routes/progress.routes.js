const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const Task = require('../models/Task')
const Subject = require('../models/Subject')

router.get('/', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user.id })
    const result = []

    for (const subject of subjects) {
      const tasks = await Task.find({ userId: req.user.id, subjectId: subject._id })
      const total = tasks.length
      const completed = tasks.filter(t => t.status === 'done').length
      const missed = tasks.filter(t => t.status === 'missed').length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0

      result.push({
        subject: { id: subject._id, name: subject.name, color: subject.color },
        totalTasks: total,
        completedTasks: completed,
        missedTasks: missed,
        completionRate: rate
      })
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/summary', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'done').length
    const missed = tasks.filter(t => t.status === 'missed').length
    const overall = total > 0 ? Math.round((completed / total) * 100) : 0

    const today = new Date()
    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      const dayTasks = tasks.filter(t => {
        const td = new Date(t.date)
        return td.toDateString() === d.toDateString()
      })
      const doneTasks = dayTasks.filter(t => t.status === 'done').length
      last7.push({ date: dateStr, done: doneTasks, total: dayTasks.length })
    }

    res.json({ total, completed, missed, overall, last7 })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router