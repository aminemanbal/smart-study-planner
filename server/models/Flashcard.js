const mongoose = require('mongoose')

/*
  Simplified SM-2 spaced repetition
  ---------------------------------
  Each card carries:
    interval        — days until next due (1, 6, 14, ...)
    easeFactor      — multiplier (default 2.5; range ~1.3 - 3.0)
    repetitions     — successful consecutive reviews
    dueAt           — when this card is next due
*/

const FlashcardSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  noteId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Note',    default: null },

  front: { type: String, required: true, maxlength: 1000 },
  back:  { type: String, required: true, maxlength: 2000 },

  interval:    { type: Number, default: 0 },
  easeFactor:  { type: Number, default: 2.5 },
  repetitions: { type: Number, default: 0 },

  dueAt:           { type: Date, default: Date.now, index: true },
  lastReviewedAt:  { type: Date, default: null },
  timesReviewed:   { type: Number, default: 0 },
  timesCorrect:    { type: Number, default: 0 },
}, { timestamps: true })

FlashcardSchema.index({ userId: 1, dueAt: 1 })

module.exports = mongoose.model('Flashcard', FlashcardSchema)
