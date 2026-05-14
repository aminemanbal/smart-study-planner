/*
  DOCUMENTS CONTROLLER — PDF upload + text extraction

    POST   /api/documents          — multipart upload (field "file"), extracts text
    GET    /api/documents          — list user's documents
    GET    /api/documents/:id      — single doc with full extracted text
    DELETE /api/documents/:id      — remove
*/

const Document = require('../models/Document')
const pdfParse = require('pdf-parse')

const MAX_CHARS = 200_000  // hard cap on stored text per doc

exports.upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received' })
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are supported' })
    }

    let parsed
    try {
      parsed = await pdfParse(req.file.buffer)
    } catch (err) {
      return res.status(422).json({ message: 'Could not parse PDF: ' + err.message })
    }

    const rawText = (parsed.text || '').replace(/\s+\n/g, '\n').trim()
    const truncated = rawText.length > MAX_CHARS
    const content = truncated ? rawText.slice(0, MAX_CHARS) : rawText

    if (content.length < 30) {
      return res.status(422).json({ message: 'No extractable text found (scanned PDF?). Try a text-based PDF.' })
    }

    const doc = await Document.create({
      userId: req.user.id,
      subjectId: req.body.subjectId || null,
      filename:  req.file.originalname.slice(0, 256),
      mimeType:  req.file.mimetype,
      sizeBytes: req.file.size,
      pageCount: parsed.numpages || 0,
      content,
      truncated,
    })

    res.status(201).json({
      _id: doc._id,
      filename: doc.filename,
      pageCount: doc.pageCount,
      sizeBytes: doc.sizeBytes,
      truncated: doc.truncated,
      charCount: content.length,
      createdAt: doc.createdAt,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.list = async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('filename pageCount sizeBytes truncated createdAt subjectId')
      .populate('subjectId', 'name color')
    res.json(docs.map(d => ({
      _id: d._id,
      filename: d.filename,
      pageCount: d.pageCount,
      sizeBytes: d.sizeBytes,
      truncated: d.truncated,
      createdAt: d.createdAt,
      subjectId: d.subjectId,
    })))
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.get = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('subjectId', 'name color')
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    res.json(doc)
  } catch (err) { res.status(500).json({ message: err.message }) }
}

exports.remove = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    res.json({ message: 'Document deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
}
