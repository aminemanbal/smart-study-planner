const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/progressController')

router.get('/', auth, ctrl.perSubject)
router.get('/summary', auth, ctrl.summary)

module.exports = router
