const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllCrops, getCrop, createCrop, updateCrop, deleteCrop, importCrops } = require('../controllers/resourceControllers');

router.route('/').get(protect, getAllCrops).post(protect, createCrop);
router.post('/import', protect, importCrops);
router.route('/:id').get(protect, getCrop).put(protect, updateCrop).delete(protect, deleteCrop);

module.exports = router;
