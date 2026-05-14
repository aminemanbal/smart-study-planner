const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
}, { _id: false, timestamps: { createdAt: true, updatedAt: false } })

const ConversationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:     { type: String, default: 'New conversation', maxlength: 120 },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  documentId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  messages:  { type: [MessageSchema], default: [] },
}, { timestamps: true })

ConversationSchema.index({ userId: 1, updatedAt: -1 })

module.exports = mongoose.model('Conversation', ConversationSchema)
