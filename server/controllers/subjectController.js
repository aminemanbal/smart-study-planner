const Subject = require('../models/Subject')
const Exam = require('../models/Exam')
const Task = require('../models/Task')
const Progress = require('../models/Progress')

exports.list = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { name, difficultyLevel, color } = req.body
    if (!name) return res.status(400).json({ message: 'Subject name is required' })
    const subject = await Subject.create({
      name, difficultyLevel, color, userId: req.user.id
    })
    res.status(201).json(subject)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    )
    if (!subject) return res.status(404).json({ message: 'Subject not found' })
    res.json(subject)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.id, userId: req.user.id
    })
    if (!subject) return res.status(404).json({ message: 'Subject not found' })
    await Exam.deleteMany({ subjectId: subject._id })
    await Task.deleteMany({ subjectId: subject._id, userId: req.user.id })
    await Progress.deleteMany({ subjectId: subject._id, userId: req.user.id })
    res.json({ message: 'Subject and linked data deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
