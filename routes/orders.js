const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  bulkDeleteOrders
} = require('../controllers/orderController');

router.route('/').get(protect, getAllOrders).post(protect, createOrder);
router.delete('/bulk', protect, bulkDeleteOrders);
router.route('/:id').get(protect, getOrder).put(protect, updateOrder).delete(protect, deleteOrder);

module.exports = router;
