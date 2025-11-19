/**
 * FarmFlow v3 - API Routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const { 
  batchController, 
  orderController, 
  standingOrderController, 
  taskController 
} = require('../controllers/mainControllers');
const { 
  dashboardController, 
  reportsController, 
  planningController 
} = require('../controllers/dashboardController');

// Middleware
const { 
  authenticate, 
  loadAccountContext, 
  requirePermission, 
  requireModule,
  checkLimit,
  paginate 
} = require('../middleware');

// ============================================================
// AUTH ROUTES (Public)
// ============================================================

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// Protected auth routes
router.post('/auth/change-password', authenticate, authController.changePassword);
router.get('/auth/me', authenticate, authController.me);

// ============================================================
// ACCOUNT-SCOPED ROUTES
// All routes below require authentication and account context
// ============================================================

const accountRouter = express.Router();
accountRouter.use(authenticate);
accountRouter.use(loadAccountContext);

// ------------------------------------------------------------
// DASHBOARD (P1-7)
// ------------------------------------------------------------

accountRouter.get('/dashboard/today', 
  requirePermission('batches:read', 'orders:read', 'tasks:read'),
  dashboardController.today
);

accountRouter.get('/dashboard/week', 
  requirePermission('batches:read', 'orders:read', 'tasks:read'),
  dashboardController.week
);

accountRouter.get('/dashboard/kpis', 
  requirePermission('reports:read'),
  dashboardController.kpis
);

// ------------------------------------------------------------
// BATCHES (P1-4 & P1-5)
// ------------------------------------------------------------

accountRouter.get('/batches/ready-to-harvest', 
  requirePermission('batches:read'),
  batchController.readyToHarvest
);

accountRouter.get('/batches', 
  requirePermission('batches:read'),
  paginate,
  batchController.list
);

accountRouter.post('/batches', 
  requirePermission('batches:create'),
  checkLimit('productionUnits'),
  batchController.create
);

accountRouter.get('/batches/:id', 
  requirePermission('batches:read'),
  batchController.getById
);

accountRouter.patch('/batches/:id/status', 
  requirePermission('batches:update'),
  batchController.updateStatus
);

accountRouter.post('/batches/:id/harvest', 
  requirePermission('batches:update'),
  batchController.recordHarvest
);

accountRouter.post('/batches/:id/move', 
  requirePermission('batches:update'),
  batchController.move
);

accountRouter.delete('/batches/:id', 
  requirePermission('batches:delete'),
  batchController.delete
);

// ------------------------------------------------------------
// ORDERS (P1-3)
// ------------------------------------------------------------

accountRouter.get('/orders', 
  requirePermission('orders:read'),
  paginate,
  orderController.list
);

accountRouter.post('/orders', 
  requirePermission('orders:create'),
  checkLimit('orders'),
  orderController.create
);

accountRouter.get('/orders/:id', 
  requirePermission('orders:read'),
  orderController.getById
);

accountRouter.put('/orders/:id', 
  requirePermission('orders:update'),
  orderController.update
);

accountRouter.patch('/orders/:id/status', 
  requirePermission('orders:update'),
  orderController.updateStatus
);

accountRouter.delete('/orders/:id', 
  requirePermission('orders:delete'),
  orderController.delete
);

// ------------------------------------------------------------
// STANDING ORDERS (P1-3)
// ------------------------------------------------------------

accountRouter.get('/standing-orders', 
  requirePermission('standing_orders:read'),
  requireModule('standing_orders'),
  standingOrderController.list
);

accountRouter.post('/standing-orders', 
  requirePermission('standing_orders:create'),
  requireModule('standing_orders'),
  standingOrderController.create
);

accountRouter.get('/standing-orders/:id', 
  requirePermission('standing_orders:read'),
  requireModule('standing_orders'),
  standingOrderController.getById
);

accountRouter.put('/standing-orders/:id', 
  requirePermission('standing_orders:update'),
  requireModule('standing_orders'),
  standingOrderController.update
);

accountRouter.post('/standing-orders/:id/pause', 
  requirePermission('standing_orders:update'),
  requireModule('standing_orders'),
  standingOrderController.pause
);

accountRouter.post('/standing-orders/:id/resume', 
  requirePermission('standing_orders:update'),
  requireModule('standing_orders'),
  standingOrderController.resume
);

accountRouter.post('/standing-orders/generate', 
  requirePermission('standing_orders:update', 'orders:create'),
  requireModule('standing_orders'),
  standingOrderController.generateOrders
);

accountRouter.delete('/standing-orders/:id', 
  requirePermission('standing_orders:delete'),
  requireModule('standing_orders'),
  standingOrderController.delete
);

// ------------------------------------------------------------
// TASKS (P1-6)
// ------------------------------------------------------------

accountRouter.get('/tasks/today', 
  requirePermission('tasks:read'),
  taskController.today
);

accountRouter.get('/tasks/overdue', 
  requirePermission('tasks:read'),
  taskController.overdue
);

accountRouter.get('/tasks', 
  requirePermission('tasks:read'),
  paginate,
  taskController.list
);

accountRouter.post('/tasks', 
  requirePermission('tasks:create'),
  taskController.create
);

accountRouter.get('/tasks/:id', 
  requirePermission('tasks:read'),
  taskController.getById
);

accountRouter.put('/tasks/:id', 
  requirePermission('tasks:update'),
  taskController.update
);

accountRouter.post('/tasks/:id/complete', 
  requirePermission('tasks:update'),
  taskController.complete
);

accountRouter.post('/tasks/:id/skip', 
  requirePermission('tasks:update'),
  taskController.skip
);

accountRouter.delete('/tasks/:id', 
  requirePermission('tasks:delete'),
  taskController.delete
);

// ------------------------------------------------------------
// PLANNING (P1-4)
// ------------------------------------------------------------

accountRouter.get('/planning/sowing-plan', 
  requirePermission('batches:read', 'orders:read'),
  requireModule('advanced_planning'),
  planningController.getSowingPlan
);

accountRouter.post('/planning/create-batches', 
  requirePermission('batches:create'),
  requireModule('advanced_planning'),
  planningController.createBatchesFromPlan
);

accountRouter.get('/planning/forecast', 
  requirePermission('batches:read'),
  planningController.getForecast
);

accountRouter.get('/planning/capacity', 
  requirePermission('batches:read', 'locations:read'),
  planningController.getCapacity
);

accountRouter.get('/planning/demand-supply/:productId', 
  requirePermission('batches:read', 'orders:read'),
  requireModule('advanced_planning'),
  planningController.getDemandSupply
);

// ------------------------------------------------------------
// REPORTS (P1-7)
// ------------------------------------------------------------

accountRouter.get('/reports/harvest-summary', 
  requirePermission('reports:read'),
  requireModule('reporting'),
  reportsController.harvestSummary
);

accountRouter.get('/reports/sales-summary', 
  requirePermission('reports:read'),
  requireModule('reporting'),
  reportsController.salesSummary
);

accountRouter.get('/reports/production-efficiency', 
  requirePermission('reports:read'),
  requireModule('reporting'),
  reportsController.productionEfficiency
);

accountRouter.get('/reports/export/:type', 
  requirePermission('export:read'),
  reportsController.exportCSV
);

// ------------------------------------------------------------
// CRUD ROUTES FOR SUPPORTING ENTITIES
// ------------------------------------------------------------

// Locations
const { Location } = require('../models');

accountRouter.get('/locations', 
  requirePermission('locations:read'),
  async (req, res, next) => {
    try {
      const locations = await Location.findAll({
        where: { accountId: req.accountId, isActive: true },
        order: [['name', 'ASC']]
      });
      res.json(locations);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.post('/locations', 
  requirePermission('locations:create'),
  checkLimit('locations'),
  async (req, res, next) => {
    try {
      const location = await Location.create({
        ...req.body,
        accountId: req.accountId
      });
      res.status(201).json(location);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.put('/locations/:id', 
  requirePermission('locations:update'),
  async (req, res, next) => {
    try {
      const location = await Location.findByPk(req.params.id);
      if (!location || location.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Location not found' });
      }
      await location.update(req.body);
      res.json(location);
    } catch (error) {
      next(error);
    }
  }
);

// Crop Types
const { CropType } = require('../models');

accountRouter.get('/crop-types', 
  requirePermission('crops:read'),
  async (req, res, next) => {
    try {
      const cropTypes = await CropType.findAll({
        where: { accountId: req.accountId, isActive: true },
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
      res.json(cropTypes);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.post('/crop-types', 
  requirePermission('crops:create'),
  async (req, res, next) => {
    try {
      const cropType = await CropType.create({
        ...req.body,
        accountId: req.accountId
      });
      res.status(201).json(cropType);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.put('/crop-types/:id', 
  requirePermission('crops:update'),
  async (req, res, next) => {
    try {
      const cropType = await CropType.findByPk(req.params.id);
      if (!cropType || cropType.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Crop type not found' });
      }
      await cropType.update(req.body);
      res.json(cropType);
    } catch (error) {
      next(error);
    }
  }
);

// Products
const { Product } = require('../models');

accountRouter.get('/products', 
  requirePermission('products:read'),
  async (req, res, next) => {
    try {
      const products = await Product.findAll({
        where: { accountId: req.accountId, isActive: true },
        include: [{ model: CropType, attributes: ['id', 'name', 'category'] }],
        order: [['name', 'ASC']]
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.post('/products', 
  requirePermission('products:create'),
  async (req, res, next) => {
    try {
      const product = await Product.create({
        ...req.body,
        accountId: req.accountId
      });
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.put('/products/:id', 
  requirePermission('products:update'),
  async (req, res, next) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product || product.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Product not found' });
      }
      await product.update(req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

// Customers
const { Customer } = require('../models');

accountRouter.get('/customers', 
  requirePermission('customers:read'),
  paginate,
  async (req, res, next) => {
    try {
      const { count, rows } = await Customer.findAndCountAll({
        where: { accountId: req.accountId, isActive: true },
        order: [['name', 'ASC']],
        limit: req.pagination.limit,
        offset: req.pagination.offset
      });
      res.json({ total: count, customers: rows });
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.post('/customers', 
  requirePermission('customers:create'),
  async (req, res, next) => {
    try {
      const customer = await Customer.create({
        ...req.body,
        accountId: req.accountId
      });
      res.status(201).json(customer);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.get('/customers/:id', 
  requirePermission('customers:read'),
  async (req, res, next) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (!customer || customer.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

accountRouter.put('/customers/:id', 
  requirePermission('customers:update'),
  async (req, res, next) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (!customer || customer.accountId !== req.accountId) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      await customer.update(req.body);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

// Mount account router
router.use('/api', accountRouter);

module.exports = router;
