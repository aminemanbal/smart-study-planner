const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const Subject = require('../models/Subject')

router.get('/', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user.id })
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { name, difficultyLevel, color } = req.body
    const subject = await Subject.create({
      name, difficultyLevel, color, userId: req.user.id
    })
    res.status(201).json(subject)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    )
    if (!subject) return res.status(404).json({ message: 'Matière introuvable' })
    res.json(subject)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ message: 'Matière supprimée' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router