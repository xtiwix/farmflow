/**
 * Customer Routes
 */
const express = require('express');
const router = express.Router();
const { Customer, PriceTier, Order, StandingOrder } = require('../models');
const { auth } = require('../middleware/auth');

// GET /api/customers
router.get('/', auth, async (req, res) => {
  try {
    const { type, active } = req.query;
    const where = { farmId: req.user.farmId };
    
    if (type) where.type = type;
    if (active !== undefined) where.isActive = active === 'true';

    const customers = await Customer.findAll({
      where,
      include: [
        { model: PriceTier, attributes: ['id', 'name'] }
      ],
      order: [['name', 'ASC']]
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: [
        { model: PriceTier },
        { model: Order, limit: 10, order: [['createdAt', 'DESC']] },
        { model: StandingOrder, where: { isActive: true }, required: false }
      ]
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers
router.post('/', auth, async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      farmId: req.user.farmId
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, farmId: req.user.farmId }
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    await customer.update(req.body);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, farmId: req.user.farmId }
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    await customer.update({ isActive: false });
    res.json({ message: 'Customer deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// GET /api/customers/:id/orders
router.get('/:id/orders', auth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.params.id },
      order: [['deliveryDate', 'DESC']],
      limit: 50
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
