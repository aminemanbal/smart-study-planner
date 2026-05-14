const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const ctrl = require('../controllers/flashcardsController')

router.get('/',              auth, ctrl.list)
router.get('/due',           auth, ctrl.due)
router.get('/stats',         auth, ctrl.stats)
router.post('/',             auth, ctrl.create)
router.post('/bulk',         auth, ctrl.bulkCreate)
router.post('/generate',     auth, ctrl.generate)
router.patch('/:id',         auth, ctrl.update)
router.post('/:id/review',   auth, ctrl.review)
router.delete('/:id',        auth, ctrl.remove)

module.exports = router
