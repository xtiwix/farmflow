/**
 * FarmFlow v3 - Batch Service (P1-4 & P1-5)
 */

const { Op } = require('sequelize');
const { 
  ProductionBatch, BatchHarvest, BatchMovement, 
  CropType, Location, Task, sequelize 
} = require('../models');
const config = require('../config');

class BatchService {
  /**
   * Create a new production batch
   */
  async createBatch(accountId, batchData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Generate batch code
      const batchCode = await this.generateBatchCode(accountId, batchData.productionType);

      // Get crop type for defaults
      const cropType = await CropType.findByPk(batchData.cropTypeId);
      
      if (!cropType) {
        throw new Error('Crop type not found');
      }

      // Calculate expected harvest date
      let plannedHarvestDate = new Date(batchData.plannedSowDate);
      if (batchData.productionType === 'microgreens_tray') {
        plannedHarvestDate.setDate(
          plannedHarvestDate.getDate() + 
          (cropType.blackoutDays || 0) + 
          (cropType.growthDays || 7)
        );
      } else {
        plannedHarvestDate.setDate(
          plannedHarvestDate.getDate() + 
          (cropType.daysPerFlush || 7)
        );
      }

      // Create batch
      const batch = await ProductionBatch.create({
        ...batchData,
        accountId,
        batchCode,
        plannedHarvestDate,
        expectedYield: batchData.expectedYield || 
          (cropType.expectedYield * (batchData.quantity || 1)),
        yieldUnit: cropType.yieldUnit || 'oz',
        maxFlushes: cropType.flushCount,
        status: 'planned'
      }, { transaction });

      // Generate QR code
      const qrCode = `BATCH-${batch.id}`;
      await batch.update({ qrCode }, { transaction });

      // Auto-generate tasks if enabled
      if (batchData.generateTasks !== false) {
        await this.generateTasksForBatch(batch, cropType, userId, transaction);
      }

      await transaction.commit();

      return this.getBatchById(batch.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Generate tasks for a batch based on templates
   */
  async generateTasksForBatch(batch, cropType, userId, transaction) {
    const templates = config.taskTemplates[batch.productionType];
    
    if (!templates) return;

    for (const template of templates) {
      // Calculate offset
      let offsetDays = template.offset;
      if (typeof offsetDays === 'string') {
        // Replace placeholders
        offsetDays = offsetDays
          .replace('{blackoutDays}', cropType.blackoutDays || 0)
          .replace('{growthDays}', cropType.growthDays || 7)
          .replace('{daysToPin}', cropType.daysPerFlush ? Math.floor(cropType.daysPerFlush * 0.7) : 5)
          .replace('{daysToHarvest}', cropType.daysPerFlush || 7);
        offsetDays = parseInt(offsetDays) || 0;
      }

      const dueDate = new Date(batch.plannedSowDate);
      dueDate.setDate(dueDate.getDate() + offsetDays);

      const title = template.title
        .replace('{crop}', cropType.name)
        .replace('{batchCode}', batch.batchCode);

      await Task.create({
        accountId: batch.accountId,
        title,
        type: template.type,
        dueDate,
        estimatedMinutes: template.estimatedMinutes,
        batchId: batch.id,
        locationId: batch.locationId,
        source: 'auto_batch',
        priority: template.type === 'harvest' ? 'high' : 'medium'
      }, { transaction });
    }
  }

  /**
   * Get batch by ID
   */
  async getBatchById(id) {
    return ProductionBatch.findByPk(id, {
      include: [
        { model: CropType },
        { model: Location },
        { model: BatchHarvest },
        { model: BatchMovement, include: [
          { model: Location, as: 'FromLocation' },
          { model: Location, as: 'ToLocation' }
        ]},
        { model: Task }
      ]
    });
  }

  /**
   * List batches with filters
   */
  async listBatches(accountId, filters = {}, pagination = {}) {
    const where = { accountId };

    if (filters.status) {
      where.status = Array.isArray(filters.status) 
        ? { [Op.in]: filters.status } 
        : filters.status;
    }

    if (filters.productionType) {
      where.productionType = filters.productionType;
    }

    if (filters.cropTypeId) {
      where.cropTypeId = filters.cropTypeId;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.plannedHarvestFrom) {
      where.plannedHarvestDate = {
        ...where.plannedHarvestDate,
        [Op.gte]: filters.plannedHarvestFrom
      };
    }

    if (filters.plannedHarvestTo) {
      where.plannedHarvestDate = {
        ...where.plannedHarvestDate,
        [Op.lte]: filters.plannedHarvestTo
      };
    }

    const { count, rows } = await ProductionBatch.findAndCountAll({
      where,
      include: [
        { model: CropType, attributes: ['id', 'name', 'category'] },
        { model: Location, attributes: ['id', 'name', 'type'] }
      ],
      order: [['plannedHarvestDate', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset
    });

    return { total: count, batches: rows };
  }

  /**
   * Update batch status
   */
  async updateStatus(batchId, status, userId, notes = null) {
    const batch = await ProductionBatch.findByPk(batchId);
    
    if (!batch) {
      throw new Error('Batch not found');
    }

    const updates = { status };

    // Handle status-specific updates
    if (status === 'planted' || status === 'inoculated') {
      updates.actualSowDate = new Date();
    } else if (status === 'harvested') {
      updates.actualHarvestDate = new Date();
    }

    if (notes) {
      updates.notes = batch.notes ? `${batch.notes}\n${notes}` : notes;
    }

    await batch.update(updates);

    return this.getBatchById(batchId);
  }

  /**
   * Record a harvest
   */
  async recordHarvest(batchId, harvestData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const batch = await ProductionBatch.findByPk(batchId);
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      // Create harvest record
      const harvest = await BatchHarvest.create({
        batchId,
        harvestDate: harvestData.harvestDate || new Date(),
        harvestTime: harvestData.harvestTime,
        quantity: harvestData.quantity,
        unit: harvestData.unit || batch.yieldUnit,
        qualityGrade: harvestData.qualityGrade || 'A',
        qualityNotes: harvestData.qualityNotes,
        flushNumber: harvestData.flushNumber || batch.currentFlush,
        harvestedById: userId,
        notes: harvestData.notes
      }, { transaction });

      // Update batch totals
      const newActualYield = parseFloat(batch.actualYield) + parseFloat(harvestData.quantity);
      const updates = { actualYield: newActualYield };

      // Update status
      if (batch.productionType === 'microgreens_tray') {
        updates.status = 'harvested';
        updates.actualHarvestDate = new Date();
      } else {
        // Mushrooms - check if more flushes
        if (batch.currentFlush >= batch.maxFlushes) {
          updates.status = 'harvested';
          updates.actualHarvestDate = new Date();
        } else {
          updates.status = 'fruiting';
          updates.currentFlush = batch.currentFlush + 1;
        }
      }

      await batch.update(updates, { transaction });

      await transaction.commit();

      return this.getBatchById(batchId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Move batch to new location
   */
  async moveBatch(batchId, toLocationId, userId, reason = null) {
    const batch = await ProductionBatch.findByPk(batchId);
    
    if (!batch) {
      throw new Error('Batch not found');
    }

    const fromLocationId = batch.locationId;

    // Record movement
    await BatchMovement.create({
      batchId,
      fromLocationId,
      toLocationId,
      movedById: userId,
      reason,
      movedAt: new Date()
    });

    // Update batch location
    await batch.update({ locationId: toLocationId });

    return this.getBatchById(batchId);
  }

  /**
   * Get batches ready to harvest
   */
  async getReadyToHarvest(accountId) {
    return ProductionBatch.findAll({
      where: {
        accountId,
        status: { [Op.in]: ['ready_to_harvest', 'growing', 'fruiting'] },
        plannedHarvestDate: { [Op.lte]: new Date() }
      },
      include: [
        { model: CropType },
        { model: Location }
      ],
      order: [['plannedHarvestDate', 'ASC']]
    });
  }

  /**
   * Get batches by status for dashboard
   */
  async getBatchesByStatus(accountId) {
    const batches = await ProductionBatch.findAll({
      where: {
        accountId,
        status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    return batches.reduce((acc, b) => {
      acc[b.status] = parseInt(b.dataValues.count);
      return acc;
    }, {});
  }

  /**
   * Generate unique batch code
   */
  async generateBatchCode(accountId, productionType) {
    const prefix = productionType === 'microgreens_tray' ? 'MG' : 'MU';
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const count = await ProductionBatch.count({
      where: {
        accountId,
        batchCode: { [Op.like]: `${prefix}-${dateStr}%` }
      }
    });

    return `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * Delete batch
   */
  async deleteBatch(batchId) {
    const batch = await ProductionBatch.findByPk(batchId);
    
    if (!batch) {
      throw new Error('Batch not found');
    }

    // Delete related records
    await BatchHarvest.destroy({ where: { batchId } });
    await BatchMovement.destroy({ where: { batchId } });
    await Task.destroy({ where: { batchId } });
    await batch.destroy();

    return { message: 'Batch deleted' };
  }
}


/**
 * Task Service - P1-6
 */
class TaskService {
  /**
   * Create a task
   */
  async createTask(accountId, taskData, userId) {
    return Task.create({
      ...taskData,
      accountId,
      source: taskData.source || 'manual'
    });
  }

  /**
   * Get task by ID
   */
  async getTaskById(id) {
    return Task.findByPk(id, {
      include: [
        { model: Location },
        { model: ProductionBatch, include: [{ model: CropType }] }
      ]
    });
  }

  /**
   * List tasks with filters
   */
  async listTasks(accountId, filters = {}, pagination = {}) {
    const where = { accountId };

    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { [Op.in]: filters.status }
        : filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters.dueDateFrom) {
      where.dueDate = {
        ...where.dueDate,
        [Op.gte]: filters.dueDateFrom
      };
    }

    if (filters.dueDateTo) {
      where.dueDate = {
        ...where.dueDate,
        [Op.lte]: filters.dueDateTo
      };
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: Location, attributes: ['id', 'name'] },
        { model: ProductionBatch, attributes: ['id', 'batchCode'], include: [
          { model: CropType, attributes: ['id', 'name'] }
        ]}
      ],
      order: [
        ['dueDate', 'ASC'],
        ['priority', 'DESC'],
        ['dueTime', 'ASC']
      ],
      limit: pagination.limit,
      offset: pagination.offset
    });

    return { total: count, tasks: rows };
  }

  /**
   * Get tasks for today (Dashboard)
   */
  async getTasksForToday(accountId, userId = null) {
    const today = new Date().toISOString().split('T')[0];

    const where = {
      accountId,
      dueDate: today,
      status: { [Op.in]: ['pending', 'in_progress'] }
    };

    if (userId) {
      where.assignedToId = userId;
    }

    return Task.findAll({
      where,
      include: [
        { model: Location, attributes: ['id', 'name'] },
        { model: ProductionBatch, attributes: ['id', 'batchCode'], include: [
          { model: CropType, attributes: ['id', 'name'] }
        ]}
      ],
      order: [
        ['priority', 'DESC'],
        ['dueTime', 'ASC']
      ]
    });
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(accountId) {
    const today = new Date().toISOString().split('T')[0];

    return Task.findAll({
      where: {
        accountId,
        dueDate: { [Op.lt]: today },
        status: { [Op.in]: ['pending', 'in_progress'] }
      },
      include: [
        { model: Location, attributes: ['id', 'name'] },
        { model: ProductionBatch, attributes: ['id', 'batchCode'] }
      ],
      order: [['dueDate', 'ASC']]
    });
  }

  /**
   * Complete a task
   */
  async completeTask(taskId, userId, completionData = {}) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    await task.update({
      status: 'completed',
      completedAt: new Date(),
      completedById: userId,
      actualMinutes: completionData.actualMinutes,
      completionNotes: completionData.notes,
      qrScannedAt: completionData.qrScanned ? new Date() : null
    });

    return this.getTaskById(taskId);
  }

  /**
   * Update task
   */
  async updateTask(taskId, updateData) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    await task.update(updateData);

    return this.getTaskById(taskId);
  }

  /**
   * Skip a task
   */
  async skipTask(taskId, userId, reason = null) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    await task.update({
      status: 'skipped',
      completedAt: new Date(),
      completedById: userId,
      completionNotes: reason ? `Skipped: ${reason}` : 'Skipped'
    });

    return this.getTaskById(taskId);
  }

  /**
   * Get task counts by status (for dashboard)
   */
  async getTaskCounts(accountId, date = null) {
    const where = { accountId };
    
    if (date) {
      where.dueDate = date;
    }

    const tasks = await Task.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    return tasks.reduce((acc, t) => {
      acc[t.status] = parseInt(t.dataValues.count);
      return acc;
    }, {});
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    await task.destroy();

    return { message: 'Task deleted' };
  }
}

module.exports = {
  batchService: new BatchService(),
  taskService: new TaskService()
};
