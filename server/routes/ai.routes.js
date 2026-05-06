const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/aiController')

router.post('/plan/generate', auth, ctrl.generatePlan)
router.get('/insights',       auth, ctrl.insights)
router.post('/chat',          auth, ctrl.chat)

module.exports = router
