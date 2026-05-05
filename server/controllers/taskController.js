const Task = require('../models/Task')
const { generatePlan } = require('../services/plannerService')

exports.list = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
      .populate('subjectId', 'name color')
      .sort({ date: 1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.generate = async (req, res) => {
  try {
    const tasks = await generatePlan(req.user.id)
    res.json({ message: `${tasks.length} tasks generated`, tasks })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (!['pending', 'done', 'missed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status },
      { new: true }
    ).populate('subjectId', 'name color')
    if (!task) return res.status(404).json({ message: 'Task not found' })
    res.json(task)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id, userId: req.user.id
    })
    if (!task) return res.status(404).json({ message: 'Task not found' })
    res.json({ message: 'Task deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
