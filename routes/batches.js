const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllBatches, getBatch, updateBatch } = require('../controllers/resourceControllers');

router.get('/', protect, getAllBatches);
router.route('/:id').get(protect, getBatch).put(protect, updateBatch);

module.exports = router;
