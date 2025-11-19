/**
 * Products & Locations Routes
 */
const express = require('express');
const router = express.Router();
const { Product, ProductPrice, PriceTier, Crop, MushroomSpecies, Location } = require('../models');
const { auth } = require('../middleware/auth');

// ========== PRODUCTS ==========

// GET /api/products
router.get('/', auth, async (req, res) => {
  try {
    const { category, active } = req.query;
    const where = {};
    
    if (category) where.category = category;
    if (active !== undefined) where.isActive = active === 'true';

    const products = await Product.findAll({
      where,
      include: [
        { model: Crop, attributes: ['id', 'name', 'variety'] },
        { model: MushroomSpecies, attributes: ['id', 'name', 'strainCode'] },
        { model: ProductPrice, include: [{ model: PriceTier }] }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Crop },
        { model: MushroomSpecies },
        { model: ProductPrice, include: [{ model: PriceTier }] }
      ]
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    const { prices, ...productData } = req.body;
    const product = await Product.create(productData);

    // Create prices for each tier
    if (prices && prices.length > 0) {
      for (const price of prices) {
        await ProductPrice.create({
          productId: product.id,
          tierId: price.tierId,
          price: price.price
        });
      }
    }

    const completeProduct = await Product.findByPk(product.id, {
      include: [{ model: ProductPrice, include: [{ model: PriceTier }] }]
    });
    res.status(201).json(completeProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await product.update(req.body);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// PUT /api/products/:id/prices
router.put('/:id/prices', auth, async (req, res) => {
  try {
    const { prices } = req.body;
    
    for (const price of prices) {
      await ProductPrice.upsert({
        productId: req.params.id,
        tierId: price.tierId,
        price: price.price
      });
    }

    const product = await Product.findByPk(req.params.id, {
      include: [{ model: ProductPrice, include: [{ model: PriceTier }] }]
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

// ========== PRICE TIERS ==========

// GET /api/products/tiers/all
router.get('/tiers/all', auth, async (req, res) => {
  try {
    const tiers = await PriceTier.findAll({
      order: [['name', 'ASC']]
    });
    res.json(tiers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price tiers' });
  }
});

// ========== LOCATIONS ==========

// GET /api/locations
router.get('/locations/all', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const where = { farmId: req.user.farmId, isActive: true };
    
    if (type) where.type = type;

    const locations = await Location.findAll({
      where,
      order: [['type', 'ASC'], ['name', 'ASC']]
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/locations/:id
router.get('/locations/:id', auth, async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { id: req.params.id, farmId: req.user.farmId }
    });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// POST /api/locations
router.post('/locations', auth, async (req, res) => {
  try {
    const location = await Location.create({
      ...req.body,
      farmId: req.user.farmId
    });
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// PUT /api/locations/:id
router.put('/locations/:id', auth, async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { id: req.params.id, farmId: req.user.farmId }
    });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    await location.update(req.body);
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
