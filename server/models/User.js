const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },

  // Profile customisation
  avatar:      { type: String, default: '' },        // base64 data URL or remote URL
  bio:         { type: String, default: '', maxlength: 240 },
  goal:        { type: String, default: '', maxlength: 240 },
  accentColor: { type: String, default: '#6366F1' }, // hex; powers UI accent
  dailyStudyHours: { type: Number, default: 2, min: 0, max: 24 },

  createdAt:   { type: Date, default: Date.now }
})

module.exports = mongoose.model('User', UserSchema)
