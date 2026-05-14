const mongoose = require('mongoose')

const StudySessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null,  index: true },
  taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task',    default: null },

  // planned duration in minutes (25 default for a Pomodoro)
  durationMinutes: { type: Number, required: true, min: 1, max: 240 },

  // how many minutes actually elapsed (filled in on complete/abandon)
  actualMinutes:   { type: Number, default: 0 },

  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active', index: true },

  startedAt: { type: Date, default: Date.now, index: true },
  endedAt:   { type: Date, default: null },
}, { timestamps: true })

StudySessionSchema.index({ userId: 1, startedAt: -1 })

module.exports = mongoose.model('StudySession', StudySessionSchema)
