const mongoose = require('mongoose')

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  color: { type: String, default: '#4F46E5' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Subject', SubjectSchema)