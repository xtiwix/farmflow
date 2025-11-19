const { Order, Customer, Crop, Task, Batch } = require('../config/database');
const { Op } = require('sequelize');
const { addDays, format } = require('date-fns');

// Helper: Generate order number
const generateOrderNumber = async () => {
  const date = new Date();
  const prefix = `ORD-${format(date, 'yyyyMMdd')}`;
  const count = await Order.count({
    where: {
      orderNumber: { [Op.like]: `${prefix}%` }
    }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

// Helper: Generate tasks from order
const generateTasksFromOrder = async (order, userId) => {
  const tasks = [];
  const deliveryDate = new Date(order.deliveryDate);
  
  for (const item of order.items) {
    const crop = await Crop.findByPk(item.cropId);
    if (!crop) continue;
    
    // Create batch for traceability
    const batch = await Batch.create({
      batchNumber: `B-${order.orderNumber}-${crop.name.substring(0, 3).toUpperCase()}`,
      cropId: crop.id,
      orderId: order.id,
      userId,
      startDate: addDays(deliveryDate, -crop.growthDays),
      harvestDate: addDays(deliveryDate, -order.deliveryOffset),
      quantity: item.quantity,
      unit: crop.unit,
      status: 'planned'
    });
    
    if (crop.category === 'microgreens') {
      const harvestDate = addDays(deliveryDate, -order.deliveryOffset);
      const growStartDate = addDays(harvestDate, -(crop.growthDays - crop.blackoutDays));
      const blackoutStartDate = addDays(harvestDate, -crop.growthDays);
      const soakDate = crop.soakTime > 0 ? addDays(blackoutStartDate, -1) : null;
      
      const traysNeeded = Math.ceil(item.quantity / crop.yieldPerTray);
      const seedWeight = traysNeeded * crop.soakRate;
      
      // Soak task
      if (soakDate && crop.soakTime > 0) {
        tasks.push({
          type: 'soak',
          category: 'microgreens',
          date: format(soakDate, 'yyyy-MM-dd'),
          status: 'pending',
          cropId: crop.id,
          orderId: order.id,
          batchId: batch.id,
          userId,
          details: {
            cropName: crop.name,
            seedType: crop.variety,
            soakRate: crop.soakRate,
            soakRateUnit: crop.soakRateUnit,
            soakTime: crop.soakTime,
            trays: traysNeeded,
            totalSeedWeight: seedWeight,
            quantity: item.quantity,
            unit: crop.unit
          }
        });
      }
      
      // Plant task
      tasks.push({
        type: 'plant',
        category: 'microgreens',
        date: format(blackoutStartDate, 'yyyy-MM-dd'),
        status: 'pending',
        cropId: crop.id,
        orderId: order.id,
        batchId: batch.id,
        userId,
        details: {
          cropName: crop.name,
          seedType: crop.variety,
          trays: traysNeeded,
          totalSeedWeight: seedWeight,
          soakRate: crop.soakRate,
          soakRateUnit: crop.soakRateUnit,
          quantity: item.quantity,
          unit: crop.unit
        }
      });
      
      // Uncover task
      tasks.push({
        type: 'uncover',
        category: 'microgreens',
        date: format(growStartDate, 'yyyy-MM-dd'),
        status: 'pending',
        cropId: crop.id,
        orderId: order.id,
        batchId: batch.id,
        userId,
        details: {
          cropName: crop.name,
          trays: traysNeeded,
          quantity: item.quantity,
          unit: crop.unit
        }
      });
      
      // Harvest task
      tasks.push({
        type: 'harvest',
        category: 'microgreens',
        date: format(harvestDate, 'yyyy-MM-dd'),
        status: 'pending',
        cropId: crop.id,
        orderId: order.id,
        batchId: batch.id,
        userId,
        details: {
          cropName: crop.name,
          trays: traysNeeded,
          expectedYield: item.quantity,
          unit: crop.unit,
          customer: order.customerName
        }
      });
      
    } else if (crop.category === 'mushrooms') {
      const harvestDate = addDays(deliveryDate, -order.deliveryOffset);
      const introDate = addDays(harvestDate, -crop.growthDays);
      const blocksNeeded = Math.ceil(item.quantity / crop.yieldPerBlock);
      
      // Introduce task
      tasks.push({
        type: 'introduce',
        category: 'mushrooms',
        date: format(introDate, 'yyyy-MM-dd'),
        status: 'pending',
        cropId: crop.id,
        orderId: order.id,
        batchId: batch.id,
        userId,
        details: {
          cropName: crop.name,
          blocks: blocksNeeded,
          estimatedYield: item.quantity,
          unit: crop.unit,
          fruitingTemp: crop.fruitingTemp,
          humidity: crop.humidity
        }
      });
      
      // Harvest task
      tasks.push({
        type: 'harvest',
        category: 'mushrooms',
        date: format(harvestDate, 'yyyy-MM-dd'),
        status: 'pending',
        cropId: crop.id,
        orderId: order.id,
        batchId: batch.id,
        userId,
        details: {
          cropName: crop.name,
          blocks: blocksNeeded,
          expectedYield: item.quantity,
          unit: crop.unit,
          customer: order.customerName
        }
      });
    }
  }
  
  // Delivery task
  const customer = await Customer.findByPk(order.customerId);
  tasks.push({
    type: 'delivery',
    category: 'delivery',
    date: format(deliveryDate, 'yyyy-MM-dd'),
    status: 'pending',
    orderId: order.id,
    userId,
    details: {
      customer: customer?.name || order.customerName,
      address: customer?.address,
      itemCount: order.items.length,
      total: order.total
    }
  });
  
  // Bulk create tasks
  await Task.bulkCreate(tasks);
  
  return tasks;
};

// @desc    Get all orders
// @route   GET /api/v1/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, customerId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const where = { userId: req.user.id };
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate && endDate) {
      where.deliveryDate = { [Op.between]: [startDate, endDate] };
    }
    
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [{ model: Customer, attributes: ['id', 'name', 'email', 'phone'] }],
      order: [['deliveryDate', 'ASC']],
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

// @desc    Get single order
// @route   GET /api/v1/orders/:id
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Customer },
        { model: Task },
        { model: Batch }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create order
// @route   POST /api/v1/orders
exports.createOrder = async (req, res, next) => {
  try {
    const {
      customerId,
      dateType,
      targetDate,
      deliveryOffset,
      items,
      notes,
      isRecurring,
      frequency,
      recurringEndDate
    } = req.body;
    
    // Get customer
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Calculate delivery date
    let deliveryDate;
    if (dateType === 'start') {
      // Find longest growth cycle
      let maxGrowth = 0;
      for (const item of items) {
        const crop = await Crop.findByPk(item.cropId);
        if (crop && crop.growthDays > maxGrowth) maxGrowth = crop.growthDays;
      }
      const harvestDate = addDays(new Date(targetDate), maxGrowth);
      deliveryDate = addDays(harvestDate, -deliveryOffset);
    } else {
      // Harvest date mode
      deliveryDate = addDays(new Date(targetDate), -deliveryOffset);
    }
    
    // Calculate total
    let total = 0;
    for (const item of items) {
      total += (item.quantity || 0) * (item.price || 0);
    }
    
    // Create order(s)
    const ordersCreated = [];
    
    const createSingleOrder = async (delDate) => {
      const orderNumber = await generateOrderNumber();
      
      const order = await Order.create({
        orderNumber,
        customerId,
        userId: req.user.id,
        dateType,
        targetDate,
        deliveryDate: format(delDate, 'yyyy-MM-dd'),
        deliveryOffset,
        items,
        total,
        notes,
        status: 'pending',
        customerName: customer.name
      });
      
      // Generate tasks
      await generateTasksFromOrder(order, req.user.id);
      
      return order;
    };
    
    if (isRecurring && recurringEndDate) {
      // Create recurring orders
      let currentDate = deliveryDate;
      const endDate = new Date(recurringEndDate);
      
      while (currentDate <= endDate) {
        const order = await createSingleOrder(currentDate);
        ordersCreated.push(order);
        
        // Next date
        if (frequency === 'weekly') {
          currentDate = addDays(currentDate, 7);
        } else if (frequency === 'biweekly') {
          currentDate = addDays(currentDate, 14);
        } else if (frequency === 'monthly') {
          currentDate = addDays(currentDate, 30);
        } else {
          break;
        }
      }
    } else {
      const order = await createSingleOrder(deliveryDate);
      ordersCreated.push(order);
    }
    
    res.status(201).json({
      success: true,
      data: ordersCreated.length === 1 ? ordersCreated[0] : ordersCreated,
      message: `${ordersCreated.length} order(s) created`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order
// @route   PUT /api/v1/orders/:id
exports.updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const {
      customerId,
      dateType,
      targetDate,
      deliveryOffset,
      items,
      notes,
      status
    } = req.body;
    
    // Delete existing tasks and batches
    await Task.destroy({ where: { orderId: order.id } });
    await Batch.destroy({ where: { orderId: order.id } });
    
    // Update order fields
    if (customerId) {
      const customer = await Customer.findByPk(customerId);
      if (customer) {
        order.customerId = customerId;
        order.customerName = customer.name;
      }
    }
    
    if (dateType) order.dateType = dateType;
    if (targetDate) order.targetDate = targetDate;
    if (deliveryOffset !== undefined) order.deliveryOffset = deliveryOffset;
    if (notes !== undefined) order.notes = notes;
    if (status) order.status = status;
    
    // Recalculate delivery date and total
    if (items) {
      order.items = items;
      
      let total = 0;
      for (const item of items) {
        total += (item.quantity || 0) * (item.price || 0);
      }
      order.total = total;
      
      // Recalculate delivery date
      let deliveryDate;
      if (order.dateType === 'start') {
        let maxGrowth = 0;
        for (const item of items) {
          const crop = await Crop.findByPk(item.cropId);
          if (crop && crop.growthDays > maxGrowth) maxGrowth = crop.growthDays;
        }
        const harvestDate = addDays(new Date(order.targetDate), maxGrowth);
        deliveryDate = addDays(harvestDate, -order.deliveryOffset);
      } else {
        deliveryDate = addDays(new Date(order.targetDate), -order.deliveryOffset);
      }
      order.deliveryDate = format(deliveryDate, 'yyyy-MM-dd');
    }
    
    await order.save();
    
    // Regenerate tasks
    if (order.status !== 'cancelled') {
      await generateTasksFromOrder(order, req.user.id);
    }
    
    res.json({
      success: true,
      data: order,
      message: 'Order updated and tasks regenerated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/v1/orders/:id
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Delete associated tasks and batches
    await Task.destroy({ where: { orderId: order.id } });
    await Batch.destroy({ where: { orderId: order.id } });
    
    await order.destroy();
    
    res.json({
      success: true,
      message: 'Order and associated tasks deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete orders
// @route   DELETE /api/v1/orders/bulk
exports.bulkDeleteOrders = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderIds array is required'
      });
    }
    
    // Delete associated tasks and batches
    await Task.destroy({
      where: { orderId: { [Op.in]: orderIds }, userId: req.user.id }
    });
    
    await Batch.destroy({
      where: { orderId: { [Op.in]: orderIds }, userId: req.user.id }
    });
    
    // Delete orders
    const deleted = await Order.destroy({
      where: { id: { [Op.in]: orderIds }, userId: req.user.id }
    });
    
    res.json({
      success: true,
      message: `${deleted} order(s) and associated tasks deleted`
    });
  } catch (error) {
    next(error);
  }
};
