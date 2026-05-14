const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/tutorController')

router.get('/conversations',          auth, ctrl.list)
router.get('/conversations/:id',      auth, ctrl.get)
router.patch('/conversations/:id',    auth, ctrl.update)
router.delete('/conversations/:id',   auth, ctrl.remove)
router.post('/chat',                  auth, ctrl.chat)

module.exports = router
