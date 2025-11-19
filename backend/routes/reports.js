const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSalesReport, getDashboardStats } = require('../controllers/resourceControllers');

router.get('/sales', protect, getSalesReport);
router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
