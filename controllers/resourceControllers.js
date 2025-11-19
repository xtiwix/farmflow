// ==================== CROP CONTROLLER ====================
const { Crop } = require('../config/database');
const { Op } = require('sequelize');

exports.getAllCrops = async (req, res, next) => {
  try {
    const { category, search, isActive = true } = req.query;
    
    const where = { 
      [Op.or]: [
        { userId: req.user.id },
        { isDefault: true }
      ]
    };
    
    if (category) where.category = category;
    if (isActive !== 'all') where.isActive = isActive === 'true';
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    
    const crops = await Crop.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    
    res.json({ success: true, data: crops });
  } catch (error) {
    next(error);
  }
};

exports.getCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findByPk(req.params.id);
    
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found'
      });
    }
    
    res.json({ success: true, data: crop });
  } catch (error) {
    next(error);
  }
};

exports.createCrop = async (req, res, next) => {
  try {
    const crop = await Crop.create({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({ success: true, data: crop });
  } catch (error) {
    next(error);
  }
};

exports.updateCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found or not authorized'
      });
    }
    
    await crop.update(req.body);
    res.json({ success: true, data: crop });
  } catch (error) {
    next(error);
  }
};

exports.deleteCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found'
      });
    }
    
    await crop.destroy();
    res.json({ success: true, message: 'Crop deleted' });
  } catch (error) {
    next(error);
  }
};

exports.importCrops = async (req, res, next) => {
  try {
    const { crops } = req.body;
    
    if (!Array.isArray(crops)) {
      return res.status(400).json({
        success: false,
        message: 'crops array is required'
      });
    }
    
    const created = await Crop.bulkCreate(
      crops.map(c => ({ ...c, userId: req.user.id }))
    );
    
    res.status(201).json({
      success: true,
      data: created,
      message: `${created.length} crops imported`
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CUSTOMER CONTROLLER ====================
const { Customer, Order } = require('../config/database');

exports.getAllCustomers = async (req, res, next) => {
  try {
    const { type, search, isActive = true } = req.query;
    
    const where = { userId: req.user.id };
    
    if (type) where.type = type;
    if (isActive !== 'all') where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const customers = await Customer.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{
        model: Order,
        limit: 10,
        order: [['deliveryDate', 'DESC']]
      }]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    await customer.update(req.body);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    await customer.destroy();
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
};

// ==================== BATCH CONTROLLER ====================
const { Batch, Task } = require('../config/database');

exports.getAllBatches = async (req, res, next) => {
  try {
    const { status, cropId } = req.query;
    
    const where = { userId: req.user.id };
    
    if (status) where.status = status;
    if (cropId) where.cropId = cropId;
    
    const batches = await Batch.findAll({
      where,
      include: [
        { model: Crop, attributes: ['id', 'name', 'category'] },
        { model: Order, attributes: ['id', 'orderNumber', 'customerName'] },
        { model: Task }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
};

exports.getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Crop },
        { model: Order, include: [{ model: Customer }] },
        { model: Task }
      ]
    });
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    await batch.update(req.body);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

// ==================== REPORTS CONTROLLER ====================

exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = { userId: req.user.id };
    
    if (startDate && endDate) {
      where.deliveryDate = { [Op.between]: [startDate, endDate] };
    }
    
    const orders = await Order.findAll({
      where,
      attributes: ['id', 'total', 'items', 'deliveryDate', 'status']
    });
    
    // Calculate stats
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    // Product breakdown
    const productSales = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!productSales[item.cropId]) {
          productSales[item.cropId] = { quantity: 0, revenue: 0 };
        }
        productSales[item.cropId].quantity += item.quantity || 0;
        productSales[item.cropId].revenue += (item.quantity || 0) * (item.price || 0);
      });
    });
    
    res.json({
      success: true,
      data: {
        totalRevenue,
        orderCount: orders.length,
        completedOrders,
        avgOrderValue,
        productSales
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [
      pendingOrders,
      todayTasks,
      activeBatches,
      weekRevenue
    ] = await Promise.all([
      Order.count({ where: { userId: req.user.id, status: 'pending' } }),
      Task.count({ where: { userId: req.user.id, date: today, status: 'pending' } }),
      Batch.count({ where: { userId: req.user.id, status: { [Op.in]: ['planned', 'growing'] } } }),
      Order.sum('total', {
        where: {
          userId: req.user.id,
          deliveryDate: { [Op.between]: [weekAgo, today] },
          status: 'completed'
        }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        pendingOrders,
        todayTasks,
        activeBatches,
        weekRevenue: weekRevenue || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
