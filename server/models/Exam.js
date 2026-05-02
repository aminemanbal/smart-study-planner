const mongoose = require('mongoose')

const ExamSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examDate: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Exam', ExamSchema)