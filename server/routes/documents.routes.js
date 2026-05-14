const express = require('express')
const multer = require('multer')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/documentsController')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },   // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are accepted'))
  },
})

// Multer error wrapper so it returns JSON instead of HTML
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}

router.post('/',        auth, handleUpload, ctrl.upload)
router.get('/',         auth, ctrl.list)
router.get('/:id',      auth, ctrl.get)
router.delete('/:id',   auth, ctrl.remove)

module.exports = router
