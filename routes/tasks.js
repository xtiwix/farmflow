const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllTasks,
  getTask,
  updateTask,
  bulkUpdateTasks,
  getDailyTasks,
  getWeeklyTasks,
  getMonthlyTasks,
  exportTasks,
  getTaskStats
} = require('../controllers/taskController');

router.get('/', protect, getAllTasks);
router.get('/stats', protect, getTaskStats);
router.get('/export', protect, exportTasks);
router.put('/bulk', protect, bulkUpdateTasks);
router.get('/daily/:date', protect, getDailyTasks);
router.get('/weekly/:date', protect, getWeeklyTasks);
router.get('/monthly/:year/:month', protect, getMonthlyTasks);
router.route('/:id').get(protect, getTask).put(protect, updateTask);

module.exports = router;
