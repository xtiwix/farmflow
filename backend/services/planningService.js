/**
 * FarmFlow v3 - Planning Service (P1-4 Sowing Planner)
 */

const { Op } = require('sequelize');
const { 
  ProductionBatch, Order, OrderItem, StandingOrder, StandingOrderItem,
  CropType, Product, sequelize 
} = require('../models');
const { batchService } = require('./batchService');

class PlanningService {
  /**
   * Generate sowing plan based on orders and standing orders
   */
  async generateSowingPlan(accountId, options = {}) {
    const {
      startDate = new Date(),
      endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      wasteBuffer = 0.1, // 10% default
      includeBuffer = true
    } = options;

    // Get all orders in date range
    const orders = await Order.findAll({
      where: {
        accountId,
        deliveryDate: { [Op.between]: [startDate, endDate] },
        status: { [Op.notIn]: ['cancelled', 'delivered'] }
      },
      include: [{ 
        model: OrderItem, 
        include: [{ 
          model: Product, 
          include: [{ model: CropType }] 
        }] 
      }]
    });

    // Aggregate demand by crop type and delivery date
    const demandMap = new Map();

    for (const order of orders) {
      for (const item of order.OrderItems) {
        if (!item.Product || !item.Product.CropType) continue;

        const cropType = item.Product.CropType;
        const key = `${cropType.id}-${order.deliveryDate}`;

        if (!demandMap.has(key)) {
          demandMap.set(key, {
            cropTypeId: cropType.id,
            cropType,
            deliveryDate: order.deliveryDate,
            totalQuantity: 0,
            orders: []
          });
        }

        const demand = demandMap.get(key);
        demand.totalQuantity += parseFloat(item.quantity);
        demand.orders.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          quantity: item.quantity
        });
      }
    }

    // Calculate sowing requirements
    const sowingPlan = [];

    for (const demand of demandMap.values()) {
      const cropType = demand.cropType;
      
      // Calculate sow date based on growth days
      const growDays = (cropType.blackoutDays || 0) + (cropType.growthDays || 7);
      const sowDate = new Date(demand.deliveryDate);
      sowDate.setDate(sowDate.getDate() - growDays);

      // Calculate quantity with buffer
      let requiredQuantity = demand.totalQuantity;
      if (includeBuffer) {
        requiredQuantity = requiredQuantity * (1 + wasteBuffer);
      }

      // Calculate units needed (trays/blocks)
      const yieldPerUnit = cropType.expectedYield || 8; // oz per tray/block
      const unitsNeeded = Math.ceil(requiredQuantity / yieldPerUnit);

      // Check existing batches
      const existingBatches = await ProductionBatch.count({
        where: {
          accountId,
          cropTypeId: cropType.id,
          plannedSowDate: sowDate,
          status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
        }
      });

      const additionalUnitsNeeded = Math.max(0, unitsNeeded - existingBatches);

      sowingPlan.push({
        cropTypeId: cropType.id,
        cropName: cropType.name,
        category: cropType.category,
        sowDate,
        harvestDate: demand.deliveryDate,
        demandQuantity: demand.totalQuantity,
        requiredQuantity: Math.round(requiredQuantity * 100) / 100,
        yieldPerUnit,
        unitsNeeded,
        existingBatches,
        additionalUnitsNeeded,
        orders: demand.orders
      });
    }

    // Sort by sow date
    sowingPlan.sort((a, b) => new Date(a.sowDate) - new Date(b.sowDate));

    return sowingPlan;
  }

  /**
   * Auto-create batches from sowing plan
   */
  async createBatchesFromPlan(accountId, planItems, userId, options = {}) {
    const { locationId, generateTasks = true } = options;
    const createdBatches = [];

    for (const item of planItems) {
      if (item.additionalUnitsNeeded <= 0) continue;

      const batch = await batchService.createBatch(accountId, {
        cropTypeId: item.cropTypeId,
        productionType: item.category === 'mushroom' ? 'mushroom_in_house' : 'microgreens_tray',
        quantity: item.additionalUnitsNeeded,
        plannedSowDate: item.sowDate,
        locationId,
        generateTasks,
        notes: `Auto-generated from sowing plan for ${item.orders.length} orders`
      }, userId);

      createdBatches.push(batch);
    }

    return createdBatches;
  }

  /**
   * Get production forecast
   */
  async getProductionForecast(accountId, days = 14) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Get batches with planned harvest in range
    const batches = await ProductionBatch.findAll({
      where: {
        accountId,
        plannedHarvestDate: { [Op.between]: [today, endDate] },
        status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
      },
      include: [{ model: CropType }]
    });

    // Aggregate by date and crop
    const forecast = {};

    for (const batch of batches) {
      const dateKey = batch.plannedHarvestDate.toISOString().split('T')[0];
      
      if (!forecast[dateKey]) {
        forecast[dateKey] = {};
      }

      const cropName = batch.CropType.name;
      if (!forecast[dateKey][cropName]) {
        forecast[dateKey][cropName] = {
          expectedYield: 0,
          unit: batch.yieldUnit,
          batches: 0
        };
      }

      forecast[dateKey][cropName].expectedYield += parseFloat(batch.expectedYield);
      forecast[dateKey][cropName].batches += batch.quantity;
    }

    return forecast;
  }

  /**
   * Check capacity utilization
   */
  async getCapacityUtilization(accountId, locationId = null) {
    const where = {
      accountId,
      status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
    };

    if (locationId) {
      where.locationId = locationId;
    }

    // Get current active batches by location
    const batches = await ProductionBatch.findAll({
      where,
      include: [{ model: require('../models').Location }],
      attributes: [
        'locationId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalUnits']
      ],
      group: ['locationId', 'Location.id']
    });

    // Calculate utilization
    const utilization = batches.map(b => {
      const capacity = b.Location?.capacity || 100;
      const used = parseInt(b.dataValues.totalUnits);
      return {
        locationId: b.locationId,
        locationName: b.Location?.name,
        capacity,
        used,
        available: capacity - used,
        utilizationPercent: Math.round((used / capacity) * 100)
      };
    });

    return utilization;
  }

  /**
   * Get demand vs supply analysis
   */
  async getDemandSupplyAnalysis(accountId, productId, days = 30) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Get product and crop type
    const product = await Product.findByPk(productId, {
      include: [{ model: CropType }]
    });

    if (!product || !product.CropType) {
      throw new Error('Product not found or no crop type linked');
    }

    // Get orders (demand)
    const orders = await OrderItem.findAll({
      where: { productId },
      include: [{
        model: Order,
        where: {
          accountId,
          deliveryDate: { [Op.between]: [today, endDate] },
          status: { [Op.notIn]: ['cancelled'] }
        }
      }]
    });

    // Get batches (supply)
    const batches = await ProductionBatch.findAll({
      where: {
        accountId,
        cropTypeId: product.CropType.id,
        plannedHarvestDate: { [Op.between]: [today, endDate] },
        status: { [Op.notIn]: ['harvested', 'disposed', 'cancelled'] }
      }
    });

    // Aggregate by date
    const analysis = {};

    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      analysis[dateKey] = { demand: 0, supply: 0, balance: 0 };
    }

    // Sum demand
    for (const item of orders) {
      const dateKey = item.Order.deliveryDate.toISOString().split('T')[0];
      if (analysis[dateKey]) {
        analysis[dateKey].demand += parseFloat(item.quantity);
      }
    }

    // Sum supply
    for (const batch of batches) {
      const dateKey = batch.plannedHarvestDate.toISOString().split('T')[0];
      if (analysis[dateKey]) {
        analysis[dateKey].supply += parseFloat(batch.expectedYield);
      }
    }

    // Calculate balance
    for (const date in analysis) {
      analysis[date].balance = analysis[date].supply - analysis[date].demand;
    }

    return {
      product: product.name,
      cropType: product.CropType.name,
      analysis
    };
  }
}

module.exports = {
  planningService: new PlanningService()
};
