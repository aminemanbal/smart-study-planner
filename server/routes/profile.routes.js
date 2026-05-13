const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/profileController')

router.get('/',  auth, ctrl.me)
router.patch('/', auth, ctrl.update)

module.exports = router
