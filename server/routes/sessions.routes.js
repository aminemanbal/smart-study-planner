const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/sessionController')

router.post('/start',                auth, ctrl.start)
router.patch('/:id/complete',        auth, ctrl.complete)
router.patch('/:id/abandon',         auth, ctrl.abandon)
router.get('/active',                auth, ctrl.active)
router.get('/today',                 auth, ctrl.today)
router.get('/stats',                 auth, ctrl.stats)

module.exports = router
