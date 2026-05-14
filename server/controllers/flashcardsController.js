/*
  FLASHCARDS CONTROLLER

    GET    /api/flashcards                 — list (filterable by subjectId, noteId)
    GET    /api/flashcards/due             — cards due now for review
    GET    /api/flashcards/stats           — totals + per-subject
    POST   /api/flashcards                 — create one (front/back/subjectId/noteId?)
    POST   /api/flashcards/bulk            — bulk create (used by AI generation)
    POST   /api/flashcards/generate        — AI generation from text or noteId
    PATCH  /api/flashcards/:id             — edit front/back
    POST   /api/flashcards/:id/review      — { quality: 0..3 } SM-2 update
    DELETE /api/flashcards/:id             — delete
*/

const Flashcard = require('../models/Flashcard')
const Note = require('../models/Note')
const Subject = require('../models/Subject')
const aiService = require('../services/aiService')

const validQuality = (q) => Number.isInteger(q) && q >= 0 && q <= 3

/* ---------- READ ---------- */

exports.list = async (req, res) => {
  try {
    const filter = { userId: req.user.id }
    if (req.query.subjectId) filter.subjectId = req.query.subjectId
    if (req.query.noteId)    filter.noteId    = req.query.noteId

    const cards = await Flashcard.find(filter)
      .sort({ updatedAt: -1 })
      .populate('subjectId', 'name color')
      .populate('noteId', 'title')
    res.json(cards)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.due = async (req, res) => {
  try {
    const filter = { userId: req.user.id, dueAt: { $lte: new Date() } }
    if (req.query.subjectId) filter.subjectId = req.query.subjectId

    const cards = await Flashcard.find(filter)
      .sort({ dueAt: 1 })
      .limit(100)
      .populate('subjectId', 'name color')
    res.json(cards)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.stats = async (req, res) => {
  try {
    const userId = req.user.id
    const now = new Date()
    const [total, due, today] = await Promise.all([
      Flashcard.countDocuments({ userId }),
      Flashcard.countDocuments({ userId, dueAt: { $lte: now } }),
      Flashcard.countDocuments({
        userId,
        lastReviewedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) },
      }),
    ])

    const bySubject = await Flashcard.aggregate([
      { $match: { userId: new (require('mongoose')).Types.ObjectId(String(userId)) } },
      { $group: {
        _id: '$subjectId',
        total: { $sum: 1 },
        due:   { $sum: { $cond: [{ $lte: ['$dueAt', now] }, 1, 0] } },
      } },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    ])

    res.json({
      total, due, reviewedToday: today,
      bySubject: bySubject.map(b => ({
        subjectId: b._id,
        name:  b.subject?.name  || 'Unknown',
        color: b.subject?.color || '#9CA3AF',
        total: b.total,
        due:   b.due,
      })),
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

/* ---------- WRITE ---------- */

exports.create = async (req, res) => {
  try {
    const { front, back, subjectId, noteId } = req.body
    if (!front || !back) return res.status(400).json({ message: 'front and back are required' })
    if (!subjectId)      return res.status(400).json({ message: 'subjectId is required' })

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id })
    if (!subject) return res.status(404).json({ message: 'Subject not found' })

    const card = await Flashcard.create({
      userId: req.user.id,
      subjectId,
      noteId: noteId || null,
      front: String(front).slice(0, 1000),
      back:  String(back).slice(0, 2000),
    })
    res.status(201).json(card)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.bulkCreate = async (req, res) => {
  try {
    const { cards, subjectId, noteId } = req.body
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ message: 'cards array is required' })
    }
    if (!subjectId) return res.status(400).json({ message: 'subjectId is required' })
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id })
    if (!subject) return res.status(404).json({ message: 'Subject not found' })

    const docs = cards
      .filter(c => c && c.front && c.back)
      .slice(0, 50)
      .map(c => ({
        userId: req.user.id,
        subjectId,
        noteId: noteId || null,
        front: String(c.front).slice(0, 1000),
        back:  String(c.back).slice(0, 2000),
      }))

    const inserted = await Flashcard.insertMany(docs)
    res.status(201).json({ count: inserted.length, cards: inserted })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.generate = async (req, res) => {
  try {
    let { text, noteId, subjectId, count } = req.body
    count = Math.max(3, Math.min(20, Number(count) || 10))

    // Resolve text + subject from noteId if provided
    if (noteId) {
      const note = await Note.findOne({ _id: noteId, userId: req.user.id }).populate('subjectId', 'name')
      if (!note) return res.status(404).json({ message: 'Note not found' })
      text = note.content
      subjectId = subjectId || (note.subjectId?._id?.toString() || note.subjectId)
    }

    if (!text || text.trim().length < 30) {
      return res.status(400).json({ message: 'Provide at least ~30 characters of text or a noteId.' })
    }
    if (!subjectId) return res.status(400).json({ message: 'subjectId is required' })
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id })
    if (!subject) return res.status(404).json({ message: 'Subject not found' })

    const cards = await aiService.generateFlashcards({ text, count, subjectName: subject.name })

    res.json({
      generated: cards.length,
      cards, // not yet saved — frontend can let user edit then call /bulk
      subjectId,
      noteId: noteId || null,
    })
  } catch (err) {
    if (err.code === 'MISSING_API_KEY') return res.status(503).json({ message: err.message })
    res.status(err.status || 500).json({ message: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const patch = {}
    if (typeof req.body.front === 'string') patch.front = req.body.front.slice(0, 1000)
    if (typeof req.body.back  === 'string') patch.back  = req.body.back.slice(0, 2000)
    const card = await Flashcard.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id }, patch, { new: true }
    )
    if (!card) return res.status(404).json({ message: 'Flashcard not found' })
    res.json(card)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

/* ---------- REVIEW (SM-2) ---------- */

exports.review = async (req, res) => {
  try {
    const quality = Number(req.body.quality)
    if (!validQuality(quality)) {
      return res.status(400).json({ message: 'quality must be 0 (Again), 1 (Hard), 2 (Good), or 3 (Easy)' })
    }

    const card = await Flashcard.findOne({ _id: req.params.id, userId: req.user.id })
    if (!card) return res.status(404).json({ message: 'Flashcard not found' })

    // SM-2 lite
    if (quality === 0) {
      // Again — reset
      card.repetitions = 0
      card.interval = 0
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2)
      card.dueAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    } else {
      card.repetitions += 1
      // Ease factor adjustment
      const ef = card.easeFactor
      if (quality === 1)      card.easeFactor = Math.max(1.3, ef - 0.15)
      else if (quality === 2) card.easeFactor = ef
      else                    card.easeFactor = ef + 0.15
      // Interval
      if (card.repetitions === 1)      card.interval = 1
      else if (card.repetitions === 2) card.interval = 6
      else                              card.interval = Math.round(card.interval * card.easeFactor)
      // Hard reduces the resulting interval slightly
      if (quality === 1) card.interval = Math.max(1, Math.round(card.interval * 0.8))
      card.dueAt = new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000)
      card.timesCorrect += 1
    }
    card.lastReviewedAt = new Date()
    card.timesReviewed += 1
    await card.save()
    res.json(card)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.remove = async (req, res) => {
  try {
    const card = await Flashcard.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!card) return res.status(404).json({ message: 'Flashcard not found' })
    res.json({ message: 'Flashcard deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
}
