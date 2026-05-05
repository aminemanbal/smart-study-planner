const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/taskController')

router.get('/', auth, ctrl.list)
router.post('/generate', auth, ctrl.generate)
router.patch('/:id/status', auth, ctrl.updateStatus)
router.delete('/:id', auth, ctrl.remove)

module.exports = router
