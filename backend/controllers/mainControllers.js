/**
 * FarmFlow v3 - Batch Controller
 */

const { batchService } = require('../services');

const batchController = {
  /**
   * POST /batches
   */
  async create(req, res, next) {
    try {
      const batch = await batchService.createBatch(
        req.accountId, 
        req.body, 
        req.userId
      );
      res.status(201).json(batch);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /batches
   */
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        productionType: req.query.productionType,
        cropTypeId: req.query.cropTypeId,
        locationId: req.query.locationId,
        plannedHarvestFrom: req.query.plannedHarvestFrom,
        plannedHarvestTo: req.query.plannedHarvestTo
      };

      const result = await batchService.listBatches(
        req.accountId, 
        filters, 
        req.pagination
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /batches/:id
   */
  async getById(req, res, next) {
    try {
      const batch = await batchService.getBatchById(req.params.id);
      
      if (!batch || batch.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batch);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /batches/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { status, notes } = req.body;
      const batch = await batchService.updateStatus(
        req.params.id, 
        status, 
        req.userId, 
        notes
      );
      res.json(batch);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /batches/:id/harvest
   */
  async recordHarvest(req, res, next) {
    try {
      const batch = await batchService.recordHarvest(
        req.params.id, 
        req.body, 
        req.userId
      );
      res.json(batch);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /batches/:id/move
   */
  async move(req, res, next) {
    try {
      const { toLocationId, reason } = req.body;
      const batch = await batchService.moveBatch(
        req.params.id, 
        toLocationId, 
        req.userId, 
        reason
      );
      res.json(batch);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /batches/ready-to-harvest
   */
  async readyToHarvest(req, res, next) {
    try {
      const batches = await batchService.getReadyToHarvest(req.accountId);
      res.json(batches);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /batches/:id
   */
  async delete(req, res, next) {
    try {
      const result = await batchService.deleteBatch(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};


/**
 * Order Controller
 */
const { orderService, standingOrderService } = require('../services');

const orderController = {
  /**
   * POST /orders
   */
  async create(req, res, next) {
    try {
      const order = await orderService.createOrder(
        req.accountId, 
        req.body, 
        req.userId
      );
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /orders
   */
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        customerId: req.query.customerId,
        deliveryDateFrom: req.query.deliveryDateFrom,
        deliveryDateTo: req.query.deliveryDateTo,
        search: req.query.search
      };

      const result = await orderService.listOrders(
        req.accountId, 
        filters, 
        req.pagination
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /orders/:id
   */
  async getById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id);
      
      if (!order || order.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /orders/:id
   */
  async update(req, res, next) {
    try {
      const order = await orderService.updateOrder(
        req.params.id, 
        req.body, 
        req.userId
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /orders/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const order = await orderService.updateStatus(
        req.params.id, 
        status, 
        req.userId
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /orders/:id
   */
  async delete(req, res, next) {
    try {
      const result = await orderService.deleteOrder(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};


/**
 * Standing Order Controller
 */
const standingOrderController = {
  /**
   * POST /standing-orders
   */
  async create(req, res, next) {
    try {
      const so = await standingOrderService.createStandingOrder(
        req.accountId, 
        req.body
      );
      res.status(201).json(so);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /standing-orders
   */
  async list(req, res, next) {
    try {
      const filters = {
        customerId: req.query.customerId,
        isActive: req.query.isActive === 'true' ? true : 
                  req.query.isActive === 'false' ? false : undefined
      };

      const standingOrders = await standingOrderService.listStandingOrders(
        req.accountId, 
        filters
      );
      res.json(standingOrders);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /standing-orders/:id
   */
  async getById(req, res, next) {
    try {
      const so = await standingOrderService.getStandingOrderById(req.params.id);
      
      if (!so || so.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Standing order not found' });
      }

      res.json(so);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /standing-orders/:id
   */
  async update(req, res, next) {
    try {
      const so = await standingOrderService.updateStandingOrder(
        req.params.id, 
        req.body
      );
      res.json(so);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /standing-orders/:id/pause
   */
  async pause(req, res, next) {
    try {
      const { pausedUntil } = req.body;
      const so = await standingOrderService.pauseStandingOrder(
        req.params.id, 
        pausedUntil
      );
      res.json(so);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /standing-orders/:id/resume
   */
  async resume(req, res, next) {
    try {
      const so = await standingOrderService.resumeStandingOrder(req.params.id);
      res.json(so);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /standing-orders/generate
   */
  async generateOrders(req, res, next) {
    try {
      const { forDate } = req.body;
      const orders = await standingOrderService.generateOrdersFromStandingOrders(
        req.accountId, 
        forDate ? new Date(forDate) : null
      );
      res.json({ generated: orders.length, orders });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /standing-orders/:id
   */
  async delete(req, res, next) {
    try {
      const result = await standingOrderService.deleteStandingOrder(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};


/**
 * Task Controller
 */
const { taskService } = require('../services');

const taskController = {
  /**
   * POST /tasks
   */
  async create(req, res, next) {
    try {
      const task = await taskService.createTask(
        req.accountId, 
        req.body, 
        req.userId
      );
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /tasks
   */
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        type: req.query.type,
        assignedToId: req.query.assignedToId,
        locationId: req.query.locationId,
        batchId: req.query.batchId,
        dueDateFrom: req.query.dueDateFrom,
        dueDateTo: req.query.dueDateTo,
        priority: req.query.priority
      };

      const result = await taskService.listTasks(
        req.accountId, 
        filters, 
        req.pagination
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /tasks/today
   */
  async today(req, res, next) {
    try {
      const tasks = await taskService.getTasksForToday(
        req.accountId, 
        req.query.userId || null
      );
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /tasks/overdue
   */
  async overdue(req, res, next) {
    try {
      const tasks = await taskService.getOverdueTasks(req.accountId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /tasks/:id
   */
  async getById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      
      if (!task || task.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /tasks/:id
   */
  async update(req, res, next) {
    try {
      const task = await taskService.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /tasks/:id/complete
   */
  async complete(req, res, next) {
    try {
      const task = await taskService.completeTask(
        req.params.id, 
        req.userId, 
        req.body
      );
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /tasks/:id/skip
   */
  async skip(req, res, next) {
    try {
      const { reason } = req.body;
      const task = await taskService.skipTask(
        req.params.id, 
        req.userId, 
        reason
      );
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /tasks/:id
   */
  async delete(req, res, next) {
    try {
      const result = await taskService.deleteTask(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = {
  batchController,
  orderController,
  standingOrderController,
  taskController
};
