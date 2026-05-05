const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/authController')

router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.get('/me', auth, ctrl.me)

module.exports = router
