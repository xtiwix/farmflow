/**
 * Tasks Routes - Calendar views, date ranges, exports
 */
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Task, MushroomBatch, MushroomSpecies } = require('../models');
const { auth } = require('../middleware/auth');

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { farmId: req.user.farmId },
      order: [['dueDate', 'ASC'], ['priority', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks by date range (for calendar views)
router.get('/range', auth, async (req, res) => {
  try {
    const { start, end, category, taskType } = req.query;
    
    const where = { farmId: req.user.farmId };
    
    if (start && end) {
      where.dueDate = { [Op.between]: [start, end] };
    } else if (start) {
      where.dueDate = { [Op.gte]: start };
    } else if (end) {
      where.dueDate = { [Op.lte]: end };
    }
    
    if (category) where.category = category;
    if (taskType) where.taskType = taskType;
    
    const tasks = await Task.findAll({
      where,
      order: [['dueDate', 'ASC'], ['taskType', 'ASC']]
    });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks grouped by date and task type (for calendar display)
router.get('/calendar', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const where = { 
      farmId: req.user.farmId,
      status: { [Op.ne]: 'cancelled' }
    };
    
    if (start && end) {
      where.dueDate = { [Op.between]: [start, end] };
    }
    
    const tasks = await Task.findAll({
      where,
      order: [['dueDate', 'ASC'], ['taskType', 'ASC']]
    });
    
    // Group by date and task type
    const grouped = {};
    for (const task of tasks) {
      const date = task.dueDate;
      if (!grouped[date]) grouped[date] = {};
      
      const taskType = task.taskType || 'other';
      if (!grouped[date][taskType]) grouped[date][taskType] = [];
      
      grouped[date][taskType].push(task);
    }
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for a specific date
router.get('/date/:date', auth, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {
        farmId: req.user.farmId,
        dueDate: req.params.date,
        status: { [Op.ne]: 'cancelled' }
      },
      order: [['taskType', 'ASC'], ['priority', 'DESC']]
    });
    
    // Group by task type for display
    const grouped = {};
    for (const task of tasks) {
      const taskType = task.taskType || 'other';
      if (!grouped[taskType]) grouped[taskType] = [];
      grouped[taskType].push(task);
    }
    
    res.json({ date: req.params.date, tasks, grouped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's tasks
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await Task.findAll({
      where: {
        farmId: req.user.farmId,
        dueDate: today,
        status: { [Op.ne]: 'cancelled' }
      },
      order: [['taskType', 'ASC'], ['priority', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      farmId: req.user.farmId,
      createdById: req.user.id
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate tasks for a batch
router.post('/generate/:batchId', auth, async (req, res) => {
  try {
    const batch = await MushroomBatch.findByPk(req.params.batchId, {
      include: [MushroomSpecies]
    });
    
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    const species = batch.MushroomSpecies;
    const receivedDate = new Date(batch.receivedDate);
    const tasks = [];
    
    // Incubation end date
    const avgIncubation = Math.round(((species.incubationDaysMin || 7) + (species.incubationDaysMax || 14)) / 2);
    const incubationEndDate = new Date(receivedDate);
    incubationEndDate.setDate(incubationEndDate.getDate() + avgIncubation);
    
    // Expected harvest date
    const avgFruiting = Math.round(((species.daysToFirstHarvest || 7) + (species.daysToFirstHarvestMax || 14)) / 2);
    const harvestDate = new Date(incubationEndDate);
    harvestDate.setDate(harvestDate.getDate() + avgFruiting);
    
    const baseTaskData = {
      farmId: req.user.farmId,
      category: 'mushrooms',
      priority: 'high',
      autoGenerated: true,
      sourceType: 'batch',
      sourceId: batch.id,
      speciesId: species.id,
      speciesName: `${species.name} (${species.strainCode})`,
      blockCount: batch.blockCount,
      expectedYieldLbs: batch.blockCount * ((species.yieldPerBlockLbsMin + species.yieldPerBlockLbsMax) / 2)
    };
    
    // Move to fruiting task
    tasks.push({
      ...baseTaskData,
      title: `Move ${species.name} to fruiting`,
      taskType: 'move_to_fruiting',
      dueDate: incubationEndDate.toISOString().split('T')[0],
      description: `Move ${batch.blockCount} blocks from incubation to fruiting room. ${species.initiationMethod || ''}`
    });
    
    // Harvest task
    tasks.push({
      ...baseTaskData,
      title: `Harvest ${species.name}`,
      taskType: 'harvest',
      dueDate: harvestDate.toISOString().split('T')[0],
      harvestDate: harvestDate.toISOString().split('T')[0],
      description: `Harvest batch ${batch.batchCode}. Expected yield: ~${(batch.blockCount * ((species.yieldPerBlockLbsMin + species.yieldPerBlockLbsMax) / 2)).toFixed(1)} lbs`
    });
    
    await Task.bulkCreate(tasks);
    
    res.json({ message: `${tasks.length} tasks generated for batch ${batch.batchCode}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    await task.update(req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete task
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    await task.update({
      status: 'completed',
      completedAt: new Date()
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete tasks
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds array required' });
    }
    
    const deleted = await Task.destroy({
      where: { id: { [Op.in]: taskIds } }
    });
    
    res.json({ message: `${deleted} tasks deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk complete tasks
router.post('/bulk-complete', auth, async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds array required' });
    }
    
    await Task.update(
      { status: 'completed', completedAt: new Date() },
      { where: { id: { [Op.in]: taskIds } } }
    );
    
    res.json({ message: `${taskIds.length} tasks completed` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
