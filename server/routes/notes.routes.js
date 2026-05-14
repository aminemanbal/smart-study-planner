const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/notesController')

router.get('/',        auth, ctrl.list)
router.get('/:id',     auth, ctrl.get)
router.post('/',       auth, ctrl.create)
router.patch('/:id',   auth, ctrl.update)
router.delete('/:id',  auth, ctrl.remove)

module.exports = router
