const mongoose = require('mongoose')

const DocumentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },

  filename:    { type: String, required: true, maxlength: 256 },
  mimeType:    { type: String, default: 'application/pdf' },
  sizeBytes:   { type: Number, default: 0 },
  pageCount:   { type: Number, default: 0 },

  // Extracted plain text (capped to keep documents small).
  // Long PDFs are truncated — we explain this to the user.
  content:        { type: String, default: '', maxlength: 200_000 },
  truncated:      { type: Boolean, default: false },
}, { timestamps: true })

DocumentSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Document', DocumentSchema)
