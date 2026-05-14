const mongoose = require('mongoose')

const NoteSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  title:     { type: String, required: true, maxlength: 200, default: 'Untitled' },
  content:   { type: String, default: '', maxlength: 50000 },
}, { timestamps: true })

NoteSchema.index({ userId: 1, updatedAt: -1 })

module.exports = mongoose.model('Note', NoteSchema)
