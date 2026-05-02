const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const Exam = require('../models/Exam')

router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.user.id }).populate('subjectId', 'name color')
    res.json(exams)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { subjectId, examDate, priority, notes } = req.body
    const exam = await Exam.create({
      subjectId, examDate, priority, notes, userId: req.user.id
    })
    res.status(201).json(exam)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    )
    if (!exam) return res.status(404).json({ message: 'Exam introuvable' })
    res.json(exam)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await Exam.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ message: 'Exam supprimé' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router