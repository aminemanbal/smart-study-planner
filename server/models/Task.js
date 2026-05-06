const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'done', 'missed'], default: 'pending' },
  estimatedMinutes: { type: Number, default: 30 },
  source: { type: String, enum: ['rule', 'ai'], default: 'rule' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Task', TaskSchema)