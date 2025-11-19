const { Task, Order, Crop, Batch, Customer } = require('../config/database');
const { Op } = require('sequelize');
const { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } = require('date-fns');

// @desc    Get all tasks with filters
// @route   GET /api/v1/tasks
exports.getAllTasks = async (req, res, next) => {
  try {
    const { status, type, cropId, date, startDate, endDate, page = 1, limit = 100 } = req.query;
    
    const where = { userId: req.user.id };
    
    if (status) where.status = status;
    if (type) where.type = type;
    if (cropId) where.cropId = cropId;
    if (date) where.date = date;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    
    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: Crop, attributes: ['id', 'name', 'variety', 'category'] },
        { model: Order, attributes: ['id', 'orderNumber', 'customerName'] },
        { model: Batch, attributes: ['id', 'batchNumber'] }
      ],
      order: [['date', 'ASC'], ['type', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for daily view
// @route   GET /api/v1/tasks/daily/:date
exports.getDailyTasks = async (req, res, next) => {
  try {
    const { date } = req.params;
    
    const tasks = await Task.findAll({
      where: {
        userId: req.user.id,
        date
      },
      include: [
        { model: Crop, attributes: ['id', 'name', 'variety', 'category'] },
        { model: Order, attributes: ['id', 'orderNumber', 'customerName'] }
      ],
      order: [['type', 'ASC']]
    });
    
    res.json({
      success: true,
      data: tasks,
      date
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for weekly view
// @route   GET /api/v1/tasks/weekly/:date
exports.getWeeklyTasks = async (req, res, next) => {
  try {
    const date = new Date(req.params.date);
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    
    const tasks = await Task.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.between]: [format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')]
        }
      },
      include: [
        { model: Crop, attributes: ['id', 'name', 'variety', 'category'] },
        { model: Order, attributes: ['id', 'orderNumber', 'customerName'] }
      ],
      order: [['date', 'ASC'], ['type', 'ASC']]
    });
    
    // Group by date
    const grouped = {};
    tasks.forEach(task => {
      if (!grouped[task.date]) grouped[task.date] = [];
      grouped[task.date].push(task);
    });
    
    res.json({
      success: true,
      data: grouped,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd')
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for monthly view
// @route   GET /api/v1/tasks/monthly/:year/:month
exports.getMonthlyTasks = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const tasks = await Task.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.between]: [format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')]
        }
      },
      include: [
        { model: Crop, attributes: ['id', 'name', 'category'] }
      ],
      order: [['date', 'ASC'], ['type', 'ASC']]
    });
    
    // Group by date
    const grouped = {};
    tasks.forEach(task => {
      if (!grouped[task.date]) grouped[task.date] = [];
      grouped[task.date].push(task);
    });
    
    res.json({
      success: true,
      data: grouped,
      year: parseInt(year),
      month: parseInt(month)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export tasks as CSV
// @route   GET /api/v1/tasks/export
exports.exportTasks = async (req, res, next) => {
  try {
    const { period, date } = req.query;
    let startDate, endDate;
    
    const refDate = date ? new Date(date) : new Date();
    
    if (period === 'daily') {
      startDate = endDate = format(refDate, 'yyyy-MM-dd');
    } else if (period === 'weekly') {
      startDate = format(startOfWeek(refDate), 'yyyy-MM-dd');
      endDate = format(endOfWeek(refDate), 'yyyy-MM-dd');
    } else if (period === 'yearly') {
      startDate = format(startOfYear(refDate), 'yyyy-MM-dd');
      endDate = format(endOfYear(refDate), 'yyyy-MM-dd');
    } else {
      // Default to all
      startDate = '2000-01-01';
      endDate = '2100-12-31';
    }
    
    const tasks = await Task.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Crop, attributes: ['name'] },
        { model: Order, attributes: ['orderNumber', 'customerName'] }
      ],
      order: [['date', 'ASC']]
    });
    
    // Generate CSV
    const headers = ['Date', 'Type', 'Crop', 'Category', 'Status', 'Customer', 'Order', 'Details'];
    const rows = tasks.map(t => [
      t.date,
      t.type,
      t.Crop?.name || t.details?.cropName || '',
      t.category || '',
      t.status,
      t.Order?.customerName || t.details?.customer || '',
      t.Order?.orderNumber || '',
      JSON.stringify(t.details || {})
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tasks-${period}-${date || 'all'}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/v1/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Crop },
        { model: Order, include: [{ model: Customer }] },
        { model: Batch }
      ]
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task status
// @route   PUT /api/v1/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const { status, notes, details } = req.body;
    
    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
        task.completedBy = req.user.id;
      } else {
        task.completedAt = null;
        task.completedBy = null;
      }
    }
    
    if (notes !== undefined) task.notes = notes;
    if (details) task.details = { ...task.details, ...details };
    
    await task.save();
    
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update task status
// @route   PUT /api/v1/tasks/bulk
exports.bulkUpdateTasks = async (req, res, next) => {
  try {
    const { taskIds, status } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({
        success: false,
        message: 'taskIds array is required'
      });
    }
    
    const updates = { status };
    if (status === 'completed') {
      updates.completedAt = new Date();
      updates.completedBy = req.user.id;
    }
    
    const [updated] = await Task.update(updates, {
      where: {
        id: { [Op.in]: taskIds },
        userId: req.user.id
      }
    });
    
    res.json({
      success: true,
      message: `${updated} task(s) updated`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task statistics
// @route   GET /api/v1/tasks/stats
exports.getTaskStats = async (req, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const [total, pending, completed, overdue, todayCount] = await Promise.all([
      Task.count({ where: { userId: req.user.id } }),
      Task.count({ where: { userId: req.user.id, status: 'pending' } }),
      Task.count({ where: { userId: req.user.id, status: 'completed' } }),
      Task.count({
        where: {
          userId: req.user.id,
          status: 'pending',
          date: { [Op.lt]: today }
        }
      }),
      Task.count({ where: { userId: req.user.id, date: today } })
    ]);
    
    res.json({
      success: true,
      data: {
        total,
        pending,
        completed,
        overdue,
        today: todayCount,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
