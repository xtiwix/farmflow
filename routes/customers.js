const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/resourceControllers');

router.route('/').get(protect, getAllCustomers).post(protect, createCustomer);
router.route('/:id').get(protect, getCustomer).put(protect, updateCustomer).delete(protect, deleteCustomer);

module.exports = router;
