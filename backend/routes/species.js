/**
 * Mushroom Species Routes - Full CRUD
 */
const express = require('express');
const router = express.Router();
const { MushroomSpecies } = require('../models');
const { auth } = require('../middleware/auth');

// Get all species
router.get('/', auth, async (req, res) => {
  try {
    const species = await MushroomSpecies.findAll({
      where: { isActive: true },
      order: [['group', 'ASC'], ['name', 'ASC']]
    });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single species
router.get('/:id', auth, async (req, res) => {
  try {
    const species = await MushroomSpecies.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get species cultivation parameters (formatted)
router.get('/:id/cultivation', auth, async (req, res) => {
  try {
    const species = await MushroomSpecies.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });
    
    res.json({
      basic: {
        id: species.id,
        name: species.name,
        scientificName: species.scientificName,
        strainCode: species.strainCode,
        group: species.group,
        difficulty: species.difficulty
      },
      substrate: {
        type: species.substrate,
        notes: species.substrateNotes,
        moistureMin: species.moisturePercentMin,
        moistureMax: species.moisturePercentMax
      },
      incubation: {
        daysMin: species.incubationDaysMin,
        daysMax: species.incubationDaysMax,
        tempMin: species.incubationTempMin,
        tempMax: species.incubationTempMax,
        notes: species.incubationNotes
      },
      fruiting: {
        tempMin: species.fruitingTempMin,
        tempMax: species.fruitingTempMax,
        humidityMin: species.fruitingHumidityMin,
        humidityMax: species.fruitingHumidityMax,
        co2Min: species.fruitingCO2Min,
        co2Max: species.fruitingCO2Max
      },
      timing: {
        daysToHarvestMin: species.daysToFirstHarvest,
        daysToHarvestMax: species.daysToFirstHarvestMax,
        harvestWindow: species.harvestWindowDays,
        totalCycle: species.totalCycleDays
      },
      yield: {
        perBlockMin: species.yieldPerBlockLbsMin,
        perBlockMax: species.yieldPerBlockLbsMax,
        flushCount: species.flushCount
      },
      technique: {
        initiation: species.initiationMethod,
        fruiting: species.fruitingTechnique,
        coldShock: species.coldShockRequired,
        coldShockTemp: species.coldShockTemp,
        coldShockDuration: species.coldShockDuration,
        topFruiting: species.topFruiting,
        casingRequired: species.casingRequired,
        light: species.lightRequirements
      },
      notes: {
        cultivation: species.cultivationNotes,
        characteristics: species.characteristics
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create species
router.post('/', auth, async (req, res) => {
  try {
    const species = await MushroomSpecies.create(req.body);
    res.status(201).json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update species
router.put('/:id', auth, async (req, res) => {
  try {
    const species = await MushroomSpecies.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });
    
    await species.update(req.body);
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete species (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const species = await MushroomSpecies.findByPk(req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });
    
    await species.update({ isActive: false });
    res.json({ message: 'Species deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import species (bulk create)
router.post('/import', auth, async (req, res) => {
  try {
    const { species } = req.body;
    if (!species || !Array.isArray(species)) {
      return res.status(400).json({ error: 'species array required' });
    }
    
    const created = await MushroomSpecies.bulkCreate(species, { 
      updateOnDuplicate: ['name', 'scientificName', 'group', 'substrate', 'difficulty']
    });
    
    res.status(201).json({ message: `${created.length} species imported` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
