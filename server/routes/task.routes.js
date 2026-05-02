const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const Task = require('../models/Task')
const { generatePlan } = require('../services/plannerService')

router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
      .populate('subjectId', 'name color')
      .sort({ date: 1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/generate', auth, async (req, res) => {
  try {
    const tasks = await generatePlan(req.user.id)
    res.json({ message: `${tasks.length} tâches générées ✅`, tasks })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status },
      { new: true }
    )
    if (!task) return res.status(404).json({ message: 'Tâche introuvable' })
    res.json(task)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ message: 'Tâche supprimée' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router