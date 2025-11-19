/**
 * FarmFlow v3 - Dashboard Controller (P1-7)
 */

const { Op } = require('sequelize');
const { 
  Order, ProductionBatch, Task, Customer, 
  CropType, BatchHarvest, sequelize 
} = require('../models');
const { orderService, batchService, taskService, planningService } = require('../services');

const dashboardController = {
  /**
   * GET /dashboard/today
   * Main dashboard view for "Today"
   */
  async today(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's orders
      const orders = await orderService.getOrdersForDate(req.accountId, today);

      // Get today's tasks
      const tasks = await taskService.getTasksForToday(req.accountId);

      // Get overdue tasks
      const overdueTasks = await taskService.getOverdueTasks(req.accountId);

      // Get batches ready to harvest
      const readyToHarvest = await batchService.getReadyToHarvest(req.accountId);

      // Get batch status summary
      const batchStatus = await batchService.getBatchesByStatus(req.accountId);

      // Get task counts
      const taskCounts = await taskService.getTaskCounts(req.accountId, today);

      // Summary
      const summary = {
        ordersToDeliver: orders.filter(o => 
          ['confirmed', 'ready', 'out_for_delivery'].includes(o.status)
        ).length,
        totalOrderValue: orders.reduce((sum, o) => sum + parseFloat(o.total), 0),
        pendingTasks: taskCounts.pending || 0,
        inProgressTasks: taskCounts.in_progress || 0,
        completedTasks: taskCounts.completed || 0,
        overdueTasks: overdueTasks.length,
        batchesReadyToHarvest: readyToHarvest.length
      };

      res.json({
        date: today,
        summary,
        orders,
        tasks,
        overdueTasks,
        readyToHarvest,
        batchStatus
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /dashboard/week
   * Weekly overview
   */
  async week(req, res, next) {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Get orders for the week
      const orders = await Order.findAll({
        where: {
          accountId: req.accountId,
          deliveryDate: { 
            [Op.between]: [
              startOfWeek.toISOString().split('T')[0], 
              endOfWeek.toISOString().split('T')[0]
            ] 
          },
          status: { [Op.notIn]: ['cancelled'] }
        },
        include: [{ model: Customer, attributes: ['id', 'name'] }],
        order: [['deliveryDate', 'ASC']]
      });

      // Get tasks for the week
      const tasks = await Task.findAll({
        where: {
          accountId: req.accountId,
          dueDate: { 
            [Op.between]: [
              startOfWeek.toISOString().split('T')[0], 
              endOfWeek.toISOString().split('T')[0]
            ] 
          }
        },
        order: [['dueDate', 'ASC'], ['priority', 'DESC']]
      });

      // Get harvests for the week
      const batches = await ProductionBatch.findAll({
        where: {
          accountId: req.accountId,
          plannedHarvestDate: { 
            [Op.between]: [
              startOfWeek.toISOString().split('T')[0], 
              endOfWeek.toISOString().split('T')[0]
            ] 
          },
          status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
        },
        include: [{ model: CropType }],
        order: [['plannedHarvestDate', 'ASC']]
      });

      // Group by day
      const weekData = {};
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dateKey = day.toISOString().split('T')[0];
        
        weekData[dateKey] = {
          orders: orders.filter(o => o.deliveryDate === dateKey),
          tasks: tasks.filter(t => t.dueDate === dateKey),
          harvests: batches.filter(b => b.plannedHarvestDate.toISOString().split('T')[0] === dateKey)
        };
      }

      res.json({
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        weekData
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /dashboard/kpis
   * Key performance indicators
   */
  async kpis(req, res, next) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Revenue last 30 days
      const revenueResult = await Order.findOne({
        where: {
          accountId: req.accountId,
          status: 'delivered',
          deliveredAt: { [Op.gte]: thirtyDaysAgo }
        },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
        ]
      });

      // Yield last 30 days
      const yieldResult = await BatchHarvest.findOne({
        where: {
          harvestDate: { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] }
        },
        include: [{
          model: ProductionBatch,
          where: { accountId: req.accountId },
          attributes: []
        }],
        attributes: [
          [sequelize.fn('SUM', sequelize.col('BatchHarvest.quantity')), 'totalYield']
        ]
      });

      // Active customers
      const activeCustomers = await Customer.count({
        where: {
          accountId: req.accountId,
          isActive: true
        }
      });

      // Active batches
      const activeBatches = await ProductionBatch.count({
        where: {
          accountId: req.accountId,
          status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
        }
      });

      res.json({
        period: '30 days',
        revenue: parseFloat(revenueResult?.dataValues?.totalRevenue) || 0,
        orderCount: parseInt(revenueResult?.dataValues?.orderCount) || 0,
        totalYield: parseFloat(yieldResult?.dataValues?.totalYield) || 0,
        activeCustomers,
        activeBatches
      });
    } catch (error) {
      next(error);
    }
  }
};


/**
 * Reports Controller (P1-7)
 */
const reportsController = {
  /**
   * GET /reports/harvest-summary
   */
  async harvestSummary(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      const where = {
        harvestDate: {}
      };

      if (startDate) {
        where.harvestDate[Op.gte] = startDate;
      }
      if (endDate) {
        where.harvestDate[Op.lte] = endDate;
      }

      const harvests = await BatchHarvest.findAll({
        where,
        include: [{
          model: ProductionBatch,
          where: { accountId: req.accountId },
          include: [{ model: CropType }]
        }],
        order: [['harvestDate', 'DESC']]
      });

      // Aggregate by crop
      const byCrop = {};
      for (const harvest of harvests) {
        const cropName = harvest.ProductionBatch.CropType.name;
        if (!byCrop[cropName]) {
          byCrop[cropName] = { quantity: 0, count: 0 };
        }
        byCrop[cropName].quantity += parseFloat(harvest.quantity);
        byCrop[cropName].count += 1;
      }

      res.json({
        period: { startDate, endDate },
        totalHarvests: harvests.length,
        totalQuantity: harvests.reduce((sum, h) => sum + parseFloat(h.quantity), 0),
        byCrop,
        harvests
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /reports/sales-summary
   */
  async salesSummary(req, res, next) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const where = {
        accountId: req.accountId,
        status: { [Op.notIn]: ['cancelled', 'draft'] }
      };

      if (startDate) {
        where.deliveryDate = { ...where.deliveryDate, [Op.gte]: startDate };
      }
      if (endDate) {
        where.deliveryDate = { ...where.deliveryDate, [Op.lte]: endDate };
      }

      const orders = await Order.findAll({
        where,
        include: [{ model: Customer, attributes: ['id', 'name', 'type'] }],
        order: [['deliveryDate', 'ASC']]
      });

      // Summary
      const summary = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.total), 0),
        deliveredOrders: orders.filter(o => o.status === 'delivered').length,
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, o) => sum + parseFloat(o.total), 0) / orders.length 
          : 0
      };

      // By customer type
      const byCustomerType = {};
      for (const order of orders) {
        const type = order.Customer?.type || 'unknown';
        if (!byCustomerType[type]) {
          byCustomerType[type] = { count: 0, revenue: 0 };
        }
        byCustomerType[type].count += 1;
        byCustomerType[type].revenue += parseFloat(order.total);
      }

      res.json({
        period: { startDate, endDate },
        summary,
        byCustomerType,
        orders
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /reports/production-efficiency
   */
  async productionEfficiency(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const where = {
        accountId: req.accountId,
        status: 'harvested'
      };

      if (startDate) {
        where.actualHarvestDate = { ...where.actualHarvestDate, [Op.gte]: startDate };
      }
      if (endDate) {
        where.actualHarvestDate = { ...where.actualHarvestDate, [Op.lte]: endDate };
      }

      const batches = await ProductionBatch.findAll({
        where,
        include: [{ model: CropType }]
      });

      // Calculate efficiency metrics
      const metrics = batches.map(batch => {
        const expected = parseFloat(batch.expectedYield) || 1;
        const actual = parseFloat(batch.actualYield) || 0;
        const efficiency = (actual / expected) * 100;

        return {
          batchCode: batch.batchCode,
          cropName: batch.CropType.name,
          expectedYield: expected,
          actualYield: actual,
          efficiency: Math.round(efficiency * 10) / 10,
          harvestDate: batch.actualHarvestDate
        };
      });

      // Overall stats
      const totalExpected = batches.reduce((sum, b) => sum + parseFloat(b.expectedYield || 0), 0);
      const totalActual = batches.reduce((sum, b) => sum + parseFloat(b.actualYield || 0), 0);

      res.json({
        period: { startDate, endDate },
        totalBatches: batches.length,
        totalExpectedYield: totalExpected,
        totalActualYield: totalActual,
        overallEfficiency: totalExpected > 0 
          ? Math.round((totalActual / totalExpected) * 1000) / 10 
          : 0,
        batches: metrics
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /reports/export/:type
   * Export data as CSV
   */
  async exportCSV(req, res, next) {
    try {
      const { type } = req.params;
      const { startDate, endDate } = req.query;

      let data = [];
      let filename = '';

      switch (type) {
        case 'orders':
          data = await Order.findAll({
            where: {
              accountId: req.accountId,
              ...(startDate && { deliveryDate: { [Op.gte]: startDate } }),
              ...(endDate && { deliveryDate: { [Op.lte]: endDate } })
            },
            include: [{ model: Customer }],
            order: [['deliveryDate', 'DESC']]
          });
          filename = `orders_${startDate || 'all'}_${endDate || 'all'}.csv`;
          break;

        case 'harvests':
          data = await BatchHarvest.findAll({
            where: {
              ...(startDate && { harvestDate: { [Op.gte]: startDate } }),
              ...(endDate && { harvestDate: { [Op.lte]: endDate } })
            },
            include: [{
              model: ProductionBatch,
              where: { accountId: req.accountId },
              include: [{ model: CropType }]
            }],
            order: [['harvestDate', 'DESC']]
          });
          filename = `harvests_${startDate || 'all'}_${endDate || 'all'}.csv`;
          break;

        default:
          return res.status(400).json({ error: 'Invalid export type' });
      }

      // Convert to CSV (simplified)
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data to export' });
      }

      const csv = this.toCSV(data, type);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  },

  // Helper to convert to CSV
  toCSV(data, type) {
    if (type === 'orders') {
      const headers = 'Order Number,Customer,Status,Delivery Date,Subtotal,Total\n';
      const rows = data.map(o => 
        `${o.orderNumber},${o.Customer?.name || ''},${o.status},${o.deliveryDate},${o.subtotal},${o.total}`
      ).join('\n');
      return headers + rows;
    }

    if (type === 'harvests') {
      const headers = 'Batch Code,Crop,Harvest Date,Quantity,Unit,Quality\n';
      const rows = data.map(h => 
        `${h.ProductionBatch.batchCode},${h.ProductionBatch.CropType.name},${h.harvestDate},${h.quantity},${h.unit},${h.qualityGrade}`
      ).join('\n');
      return headers + rows;
    }

    return '';
  }
};


/**
 * Planning Controller (P1-4)
 */
const planningController = {
  /**
   * GET /planning/sowing-plan
   */
  async getSowingPlan(req, res, next) {
    try {
      const { startDate, endDate, wasteBuffer } = req.query;

      const plan = await planningService.generateSowingPlan(req.accountId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        wasteBuffer: wasteBuffer ? parseFloat(wasteBuffer) : undefined
      });

      res.json(plan);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /planning/create-batches
   */
  async createBatchesFromPlan(req, res, next) {
    try {
      const { planItems, locationId, generateTasks } = req.body;

      const batches = await planningService.createBatchesFromPlan(
        req.accountId,
        planItems,
        req.userId,
        { locationId, generateTasks }
      );

      res.status(201).json({ created: batches.length, batches });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /planning/forecast
   */
  async getForecast(req, res, next) {
    try {
      const { days } = req.query;
      const forecast = await planningService.getProductionForecast(
        req.accountId, 
        days ? parseInt(days) : 14
      );
      res.json(forecast);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /planning/capacity
   */
  async getCapacity(req, res, next) {
    try {
      const { locationId } = req.query;
      const capacity = await planningService.getCapacityUtilization(
        req.accountId, 
        locationId
      );
      res.json(capacity);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /planning/demand-supply/:productId
   */
  async getDemandSupply(req, res, next) {
    try {
      const { productId } = req.params;
      const { days } = req.query;

      const analysis = await planningService.getDemandSupplyAnalysis(
        req.accountId,
        productId,
        days ? parseInt(days) : 30
      );

      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = {
  dashboardController,
  reportsController,
  planningController
};
