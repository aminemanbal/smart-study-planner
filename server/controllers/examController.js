const Exam = require('../models/Exam')
const Subject = require('../models/Subject')

exports.list = async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.user.id })
      .populate('subjectId', 'name color difficultyLevel')
      .sort({ examDate: 1 })
    res.json(exams)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { subjectId, examDate, priority, notes } = req.body
    if (!subjectId || !examDate) {
      return res.status(400).json({ message: 'subjectId and examDate are required' })
    }
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id })
    if (!subject) return res.status(404).json({ message: 'Subject not found' })
    const exam = await Exam.create({
      subjectId, examDate, priority, notes, userId: req.user.id
    })
    res.status(201).json(exam)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    )
    if (!exam) return res.status(404).json({ message: 'Exam not found' })
    res.json(exam)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id, userId: req.user.id
    })
    if (!exam) return res.status(404).json({ message: 'Exam not found' })
    res.json({ message: 'Exam deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
