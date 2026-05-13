const User = require('../models/User')

/* GET /api/profile — return the logged-in user's full profile (no password) */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/* PATCH /api/profile — update editable fields */
const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

exports.update = async (req, res) => {
  try {
    const update = {}
    const { name, bio, goal, accentColor, dailyStudyHours, avatar } = req.body

    if (typeof name === 'string') {
      const v = name.trim()
      if (!v || v.length > 80) return res.status(400).json({ message: 'Name must be 1-80 chars' })
      update.name = v
    }
    if (typeof bio === 'string') {
      if (bio.length > 240) return res.status(400).json({ message: 'Bio max 240 chars' })
      update.bio = bio.trim()
    }
    if (typeof goal === 'string') {
      if (goal.length > 240) return res.status(400).json({ message: 'Goal max 240 chars' })
      update.goal = goal.trim()
    }
    if (typeof accentColor === 'string') {
      if (!HEX.test(accentColor)) return res.status(400).json({ message: 'accentColor must be a hex like #6366F1' })
      update.accentColor = accentColor
    }
    if (typeof dailyStudyHours === 'number') {
      if (dailyStudyHours < 0 || dailyStudyHours > 24) {
        return res.status(400).json({ message: 'dailyStudyHours must be 0-24' })
      }
      update.dailyStudyHours = dailyStudyHours
    }
    if (typeof avatar === 'string') {
      // accept either empty string (clear) or a data URL / http(s) URL
      if (avatar.length > 800_000) {
        return res.status(413).json({ message: 'Avatar too large — must be under 800 KB.' })
      }
      if (avatar && !/^(data:image\/(png|jpeg|jpg|webp);base64,|https?:\/\/)/.test(avatar)) {
        return res.status(400).json({ message: 'Avatar must be a data URL (PNG/JPEG/WebP) or http(s) URL.' })
      }
      update.avatar = avatar
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' })
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
