/**
 * FarmFlow v3 - Order Service
 */

const { Op } = require('sequelize');
const { 
  Order, OrderItem, Customer, Product, 
  StandingOrder, StandingOrderItem, sequelize 
} = require('../models');

class OrderService {
  /**
   * Create a new order
   */
  async createOrder(accountId, orderData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber(accountId);

      // Create order
      const order = await Order.create({
        ...orderData,
        accountId,
        orderNumber,
        createdById: userId,
        source: orderData.source || 'manual'
      }, { transaction });

      // Create order items
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const product = await Product.findByPk(item.productId);
          
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const unitPrice = item.unitPrice || product.basePrice;
          const total = parseFloat(item.quantity) * parseFloat(unitPrice);

          await OrderItem.create({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            total,
            notes: item.notes
          }, { transaction });
        }
      }

      // Calculate totals
      await this.recalculateTotals(order.id, transaction);

      await transaction.commit();

      // Reload with items
      return this.getOrderById(order.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update order
   */
  async updateOrder(orderId, updateData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order fields
      await order.update(updateData, { transaction });

      // Update items if provided
      if (updateData.items) {
        // Delete existing items
        await OrderItem.destroy({ 
          where: { orderId }, 
          transaction 
        });

        // Create new items
        for (const item of updateData.items) {
          const product = await Product.findByPk(item.productId);
          const unitPrice = item.unitPrice || product.basePrice;
          const total = parseFloat(item.quantity) * parseFloat(unitPrice);

          await OrderItem.create({
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            total,
            notes: item.notes
          }, { transaction });
        }

        // Recalculate totals
        await this.recalculateTotals(orderId, transaction);
      }

      await transaction.commit();

      return this.getOrderById(orderId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderId, status, userId) {
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const updates = { status };

    if (status === 'delivered') {
      updates.deliveredAt = new Date();
    }

    await order.update(updates);

    return this.getOrderById(orderId);
  }

  /**
   * Get order by ID with all related data
   */
  async getOrderById(orderId) {
    return Order.findByPk(orderId, {
      include: [
        { model: Customer },
        { 
          model: OrderItem, 
          include: [{ model: Product }] 
        },
        { model: StandingOrder }
      ]
    });
  }

  /**
   * List orders with filters
   */
  async listOrders(accountId, filters = {}, pagination = {}) {
    const where = { accountId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.deliveryDateFrom) {
      where.deliveryDate = {
        ...where.deliveryDate,
        [Op.gte]: filters.deliveryDateFrom
      };
    }

    if (filters.deliveryDateTo) {
      where.deliveryDate = {
        ...where.deliveryDate,
        [Op.lte]: filters.deliveryDateTo
      };
    }

    if (filters.search) {
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${filters.search}%` } },
        { '$Customer.name$': { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'name', 'type'] },
        { model: OrderItem, include: [{ model: Product, attributes: ['id', 'name'] }] }
      ],
      order: [['deliveryDate', 'ASC'], ['createdAt', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset
    });

    return { total: count, orders: rows };
  }

  /**
   * Get orders for a specific date (Today Dashboard)
   */
  async getOrdersForDate(accountId, date) {
    return Order.findAll({
      where: {
        accountId,
        deliveryDate: date,
        status: { [Op.notIn]: ['cancelled', 'draft'] }
      },
      include: [
        { model: Customer },
        { model: OrderItem, include: [{ model: Product }] }
      ],
      order: [['deliveryTime', 'ASC']]
    });
  }

  /**
   * Recalculate order totals
   */
  async recalculateTotals(orderId, transaction = null) {
    const items = await OrderItem.findAll({ where: { orderId } });
    
    const subtotal = items.reduce((sum, item) => 
      sum + parseFloat(item.total), 0
    );

    const order = await Order.findByPk(orderId);
    const discount = parseFloat(order.discount) || 0;
    const tax = parseFloat(order.tax) || 0;
    const total = subtotal - discount + tax;

    await order.update({ subtotal, total }, { transaction });

    return { subtotal, total };
  }

  /**
   * Generate unique order number
   */
  async generateOrderNumber(accountId) {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastOrder = await Order.findOne({
      where: {
        accountId,
        orderNumber: { [Op.like]: `${prefix}%` }
      },
      order: [['orderNumber', 'DESC']]
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop());
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Delete items first
    await OrderItem.destroy({ where: { orderId } });
    await order.destroy();

    return { message: 'Order deleted' };
  }
}


/**
 * Standing Order Service - P1-3
 */
class StandingOrderService {
  /**
   * Create standing order
   */
  async createStandingOrder(accountId, data) {
    const transaction = await sequelize.transaction();

    try {
      const standingOrder = await StandingOrder.create({
        ...data,
        accountId
      }, { transaction });

      // Create items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await StandingOrderItem.create({
            standingOrderId: standingOrder.id,
            productId: item.productId,
            quantity: item.quantity
          }, { transaction });
        }
      }

      await transaction.commit();

      return this.getStandingOrderById(standingOrder.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get standing order by ID
   */
  async getStandingOrderById(id) {
    return StandingOrder.findByPk(id, {
      include: [
        { model: Customer },
        { model: StandingOrderItem, include: [{ model: Product }] }
      ]
    });
  }

  /**
   * List standing orders
   */
  async listStandingOrders(accountId, filters = {}) {
    const where = { accountId };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return StandingOrder.findAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'name'] },
        { model: StandingOrderItem, include: [{ model: Product, attributes: ['id', 'name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Generate orders from standing orders
   * This is the core P1-3 scheduler
   */
  async generateOrdersFromStandingOrders(accountId, forDate = null) {
    const targetDate = forDate || new Date();
    const dayOfWeek = targetDate.getDay();

    // Find active standing orders due for generation
    const standingOrders = await StandingOrder.findAll({
      where: {
        accountId,
        isActive: true,
        autoGenerate: true,
        isPaused: false,
        startDate: { [Op.lte]: targetDate },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: targetDate } }
        ]
      },
      include: [
        { model: Customer },
        { model: StandingOrderItem, include: [{ model: Product }] }
      ]
    });

    const orderService = new OrderService();
    const generatedOrders = [];

    for (const so of standingOrders) {
      // Check if this standing order should generate for target date
      if (!so.deliveryDays.includes(dayOfWeek)) {
        continue;
      }

      // Check if order already exists for this date
      const existingOrder = await Order.findOne({
        where: {
          accountId,
          standingOrderId: so.id,
          deliveryDate: targetDate
        }
      });

      if (existingOrder) {
        continue;
      }

      // Calculate delivery date based on generateDaysAhead
      const deliveryDate = new Date(targetDate);
      deliveryDate.setDate(deliveryDate.getDate() + so.generateDaysAhead);

      // Create order from standing order
      const orderData = {
        customerId: so.customerId,
        deliveryDate,
        deliveryTime: so.deliveryTime,
        deliveryAddress: so.Customer.address,
        deliveryInstructions: so.Customer.deliveryInstructions,
        source: 'standing_order',
        standingOrderId: so.id,
        notes: `Auto-generated from standing order: ${so.name || so.id}`,
        items: so.StandingOrderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.Product.basePrice
        }))
      };

      const order = await orderService.createOrder(accountId, orderData, null);
      generatedOrders.push(order);

      // Update last generated timestamp
      await so.update({ lastGeneratedAt: new Date() });
    }

    return generatedOrders;
  }

  /**
   * Pause standing order
   */
  async pauseStandingOrder(id, pausedUntil = null) {
    const so = await StandingOrder.findByPk(id);
    
    if (!so) {
      throw new Error('Standing order not found');
    }

    await so.update({
      isPaused: true,
      pausedUntil
    });

    return this.getStandingOrderById(id);
  }

  /**
   * Resume standing order
   */
  async resumeStandingOrder(id) {
    const so = await StandingOrder.findByPk(id);
    
    if (!so) {
      throw new Error('Standing order not found');
    }

    await so.update({
      isPaused: false,
      pausedUntil: null
    });

    return this.getStandingOrderById(id);
  }

  /**
   * Update standing order
   */
  async updateStandingOrder(id, data) {
    const transaction = await sequelize.transaction();

    try {
      const so = await StandingOrder.findByPk(id);
      
      if (!so) {
        throw new Error('Standing order not found');
      }

      await so.update(data, { transaction });

      // Update items if provided
      if (data.items) {
        await StandingOrderItem.destroy({ 
          where: { standingOrderId: id }, 
          transaction 
        });

        for (const item of data.items) {
          await StandingOrderItem.create({
            standingOrderId: id,
            productId: item.productId,
            quantity: item.quantity
          }, { transaction });
        }
      }

      await transaction.commit();

      return this.getStandingOrderById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete standing order
   */
  async deleteStandingOrder(id) {
    const so = await StandingOrder.findByPk(id);
    
    if (!so) {
      throw new Error('Standing order not found');
    }

    await StandingOrderItem.destroy({ where: { standingOrderId: id } });
    await so.destroy();

    return { message: 'Standing order deleted' };
  }
}

module.exports = {
  orderService: new OrderService(),
  standingOrderService: new StandingOrderService()
};
