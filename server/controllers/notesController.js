/*
  NOTES CONTROLLER
    GET    /api/notes                    — list (summaries, no body)
    GET    /api/notes/:id                — get full note
    POST   /api/notes                    — create
    PATCH  /api/notes/:id                — update title/content/subjectId
    DELETE /api/notes/:id                — delete
*/

const Note = require('../models/Note')
const Subject = require('../models/Subject')

exports.list = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .populate('subjectId', 'name color')
      .select('title subjectId updatedAt createdAt content')
      .lean()

    res.json(notes.map(n => ({
      _id: n._id,
      title: n.title,
      subjectId: n.subjectId,
      updatedAt: n.updatedAt,
      createdAt: n.createdAt,
      preview: (n.content || '').replace(/[#*>`_-]/g, '').trim().slice(0, 120),
      hasContent: (n.content || '').trim().length > 0,
    })))
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.get = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('subjectId', 'name color difficultyLevel')
    if (!note) return res.status(404).json({ message: 'Note not found' })
    res.json(note)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.create = async (req, res) => {
  try {
    const { title, content, subjectId } = req.body
    if (!subjectId) return res.status(400).json({ message: 'subjectId is required' })
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id })
    if (!subject) return res.status(404).json({ message: 'Subject not found' })

    const note = await Note.create({
      userId: req.user.id,
      subjectId,
      title: (title || '').trim().slice(0, 200) || 'Untitled',
      content: content || '',
    })
    const populated = await Note.findById(note._id).populate('subjectId', 'name color')
    res.status(201).json(populated)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.update = async (req, res) => {
  try {
    const patch = {}
    if (typeof req.body.title === 'string') {
      patch.title = req.body.title.trim().slice(0, 200) || 'Untitled'
    }
    if (typeof req.body.content === 'string') {
      if (req.body.content.length > 50000) {
        return res.status(413).json({ message: 'Note content too long (max 50,000 chars)' })
      }
      patch.content = req.body.content
    }
    if (req.body.subjectId) {
      const subject = await Subject.findOne({ _id: req.body.subjectId, userId: req.user.id })
      if (!subject) return res.status(404).json({ message: 'Subject not found' })
      patch.subjectId = req.body.subjectId
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      patch,
      { new: true }
    ).populate('subjectId', 'name color')
    if (!note) return res.status(404).json({ message: 'Note not found' })
    res.json(note)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.remove = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!note) return res.status(404).json({ message: 'Note not found' })
    res.json({ message: 'Note deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
}
