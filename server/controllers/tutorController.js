/*
  TUTOR CONTROLLER — Conversations + streaming chat for the AI tutor page.

    GET    /api/tutor/conversations              — list (no message bodies)
    GET    /api/tutor/conversations/:id          — full conversation
    PATCH  /api/tutor/conversations/:id          — rename (title or subjectId)
    DELETE /api/tutor/conversations/:id          — delete
    POST   /api/tutor/chat                       — SSE: send + stream reply
                                                    Body: { conversationId?, message, subjectId? }
*/

const Conversation = require('../models/Conversation')
const Subject = require('../models/Subject')
const Document = require('../models/Document')
const aiService = require('../services/aiService')

const handle = (err, res) => {
  if (err.code === 'MISSING_API_KEY') return res.status(503).json({ message: err.message })
  const status = err.status || 500
  return res.status(status).json({ message: err.message || 'Tutor request failed' })
}

exports.list = async (req, res) => {
  try {
    const convos = await Conversation.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select('title subjectId documentId updatedAt createdAt messages')
      .populate('subjectId', 'name color')
      .populate('documentId', 'filename')
      .lean()

    // Strip messages but keep last preview + count
    const summaries = convos.map(c => ({
      _id:        c._id,
      title:      c.title,
      subjectId:  c.subjectId,
      documentId: c.documentId,
      updatedAt:  c.updatedAt,
      createdAt:  c.createdAt,
      messageCount: c.messages?.length || 0,
      preview:    c.messages?.length
        ? (c.messages[c.messages.length - 1].content || '').slice(0, 90)
        : '',
    }))

    res.json(summaries)
  } catch (err) { handle(err, res) }
}

exports.get = async (req, res) => {
  try {
    const c = await Conversation.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('subjectId', 'name color difficultyLevel')
      .populate('documentId', 'filename pageCount')
    if (!c) return res.status(404).json({ message: 'Conversation not found' })
    res.json(c)
  } catch (err) { handle(err, res) }
}

exports.update = async (req, res) => {
  try {
    const patch = {}
    if (typeof req.body.title === 'string') {
      const t = req.body.title.trim().slice(0, 120)
      if (!t) return res.status(400).json({ message: 'Title cannot be empty' })
      patch.title = t
    }
    if (req.body.subjectId !== undefined) {
      patch.subjectId = req.body.subjectId || null
    }
    if (req.body.documentId !== undefined) {
      patch.documentId = req.body.documentId || null
    }
    const c = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      patch,
      { new: true }
    ).populate('subjectId', 'name color')
    if (!c) return res.status(404).json({ message: 'Conversation not found' })
    res.json(c)
  } catch (err) { handle(err, res) }
}

exports.remove = async (req, res) => {
  try {
    const c = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!c) return res.status(404).json({ message: 'Conversation not found' })
    res.json({ message: 'Conversation deleted' })
  } catch (err) { handle(err, res) }
}

const titleFrom = (text) => {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= 50) return clean
  const cut = clean.slice(0, 50)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…'
}

exports.chat = async (req, res) => {
  try {
    const { conversationId, message, subjectId, documentId } = req.body || {}
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'message is required' })
    }
    if (message.length > 4000) {
      return res.status(400).json({ message: 'message too long (max 4000 chars)' })
    }

    // Find or create the conversation
    let convo
    if (conversationId) {
      convo = await Conversation.findOne({ _id: conversationId, userId: req.user.id })
      if (!convo) return res.status(404).json({ message: 'Conversation not found' })
    } else {
      convo = new Conversation({
        userId: req.user.id,
        title: titleFrom(message),
        subjectId: subjectId || null,
        documentId: documentId || null,
      })
    }

    // Optionally update subject/document if changed mid-conversation
    if (subjectId !== undefined && conversationId) {
      convo.subjectId = subjectId || null
    }
    if (documentId !== undefined && conversationId) {
      convo.documentId = documentId || null
    }

    // Append the user message and persist BEFORE streaming so we don't lose it
    convo.messages.push({ role: 'user', content: message.trim() })
    await convo.save()

    // SSE setup
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()

    // First event: conversation meta so the client knows the id (if new)
    res.write(`data: ${JSON.stringify({
      type: 'meta',
      conversationId: convo._id.toString(),
      title: convo.title,
      isNew: !conversationId,
    })}\n\n`)

    // Resolve subject context (verify ownership)
    let subjectContext = null
    if (convo.subjectId) {
      const subj = await Subject.findOne({ _id: convo.subjectId, userId: req.user.id })
      if (subj) subjectContext = { name: subj.name, difficultyLevel: subj.difficultyLevel }
    }

    // Resolve document context (verify ownership)
    let documentContext = null
    if (convo.documentId) {
      const doc = await Document.findOne({ _id: convo.documentId, userId: req.user.id })
      if (doc) documentContext = { filename: doc.filename, pageCount: doc.pageCount, content: doc.content }
    }

    try {
      const fullContent = await aiService.tutorStream({
        messages: convo.messages,
        subjectContext,
        documentContext,
        res,
      })

      if (fullContent && fullContent.trim()) {
        convo.messages.push({ role: 'assistant', content: fullContent })
        await convo.save()
      }

      res.write(`data: ${JSON.stringify({ type: 'done', updatedAt: convo.updatedAt })}\n\n`)
    } catch (err) {
      const payload = err.code === 'MISSING_API_KEY'
        ? { type: 'error', message: err.message }
        : { type: 'error', message: err.message || 'Tutor failed' }
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    } finally {
      res.end()
    }
  } catch (err) { handle(err, res) }
}
