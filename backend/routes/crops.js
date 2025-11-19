/**
 * Crops (Microgreens) Routes - Full CRUD
 */
const express = require('express');
const router = express.Router();
const { Crop } = require('../models');
const { auth } = require('../middleware/auth');

// Get all crops
router.get('/', auth, async (req, res) => {
  try {
    const crops = await Crop.findAll({
      where: { isActive: true },
      order: [['name', 'ASC'], ['variety', 'ASC']]
    });
    res.json(crops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single crop
router.get('/:id', auth, async (req, res) => {
  try {
    const crop = await Crop.findByPk(req.params.id);
    if (!crop) return res.status(404).json({ error: 'Crop not found' });
    res.json(crop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create crop
router.post('/', auth, async (req, res) => {
  try {
    const crop = await Crop.create(req.body);
    res.status(201).json(crop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update crop
router.put('/:id', auth, async (req, res) => {
  try {
    const crop = await Crop.findByPk(req.params.id);
    if (!crop) return res.status(404).json({ error: 'Crop not found' });
    
    await crop.update(req.body);
    res.json(crop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete crop (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const crop = await Crop.findByPk(req.params.id);
    if (!crop) return res.status(404).json({ error: 'Crop not found' });
    
    await crop.update({ isActive: false });
    res.json({ message: 'Crop deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import crops (bulk create)
router.post('/import', auth, async (req, res) => {
  try {
    const { crops } = req.body;
    if (!crops || !Array.isArray(crops)) {
      return res.status(400).json({ error: 'crops array required' });
    }
    
    const created = await Crop.bulkCreate(crops, { 
      updateOnDuplicate: ['name', 'variety', 'defaultSowGrams', 'daysToHarvest', 'blackoutDays', 
                         'expectedYieldGrams', 'soakHours', 'lightHours', 'tempMin', 'tempMax', 'notes']
    });
    
    res.status(201).json({ message: `${created.length} crops imported` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
