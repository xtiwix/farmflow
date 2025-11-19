/**
 * Mushroom Batches & Blocks Routes
 */
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { 
  MushroomBatch, 
  MushroomBlock, 
  MushroomSpecies, 
  BlockSupplier, 
  BlockHarvest, 
  BlockMovement,
  Location,
  User,
  Task
} = require('../models');
const { auth } = require('../middleware/auth');

// ========== BATCHES ==========

// GET /api/batches
router.get('/', auth, async (req, res) => {
  try {
    const { speciesId, supplierId } = req.query;
    const where = { farmId: req.user.farmId };
    
    if (speciesId) where.speciesId = speciesId;
    if (supplierId) where.supplierId = supplierId;

    const batches = await MushroomBatch.findAll({
      where,
      include: [
        { model: MushroomSpecies, attributes: ['id', 'name', 'strainCode', 'group'] },
        { model: BlockSupplier, attributes: ['id', 'name'] },
        { model: MushroomBlock, attributes: ['id', 'status'] }
      ],
      order: [['receivedDate', 'DESC']]
    });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// GET /api/batches/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const batch = await MushroomBatch.findOne({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: [
        { model: MushroomSpecies },
        { model: BlockSupplier },
        { 
          model: MushroomBlock,
          include: [
            { model: Location, attributes: ['id', 'name', 'code'] },
            { model: BlockHarvest }
          ]
        }
      ]
    });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// POST /api/batches
router.post('/', auth, async (req, res) => {
  try {
    const { speciesId, supplierId, receivedDate, blockCount, blockWeightLbs, cost, notes, locationId } = req.body;

    // Generate batch code
    const species = await MushroomSpecies.findByPk(speciesId);
    if (!species) {
      return res.status(404).json({ error: 'Species not found' });
    }

    const dateStr = new Date(receivedDate).toISOString().slice(2, 10).replace(/-/g, '');
    const batchCode = `${species.strainCode}-${dateStr}`;

    // Create batch
    const batch = await MushroomBatch.create({
      farmId: req.user.farmId,
      speciesId,
      supplierId,
      batchCode,
      receivedDate,
      blockCount,
      blockWeightLbs: blockWeightLbs || 10,
      cost,
      notes
    });

    // Create individual blocks
    const blocks = [];
    for (let i = 1; i <= blockCount; i++) {
      blocks.push({
        batchId: batch.id,
        blockCode: `${batchCode}-${i.toString().padStart(3, '0')}`,
        status: 'incubating',
        incubationStartDate: receivedDate,
        locationId,
        currentFlush: 0,
        totalYieldLbs: 0
      });
    }
    await MushroomBlock.bulkCreate(blocks);

    // Fetch complete batch
    const completeBatch = await MushroomBatch.findByPk(batch.id, {
      include: [
        { model: MushroomSpecies },
        { model: MushroomBlock }
      ]
    });

    res.status(201).json(completeBatch);
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// GET /api/batches/:id/summary
router.get('/:id/summary', auth, async (req, res) => {
  try {
    const batch = await MushroomBatch.findOne({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: [
        { model: MushroomSpecies },
        { model: MushroomBlock, include: [{ model: BlockHarvest }] }
      ]
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Calculate summary
    const blocks = batch.MushroomBlocks;
    const statusCounts = {};
    let totalYield = 0;
    let totalHarvests = 0;

    blocks.forEach(block => {
      statusCounts[block.status] = (statusCounts[block.status] || 0) + 1;
      totalYield += parseFloat(block.totalYieldLbs || 0);
      totalHarvests += block.BlockHarvests?.length || 0;
    });

    const expectedYield = batch.blockCount * (
      parseFloat(batch.MushroomSpecies.yieldPerBlockLbsMax) || 2.5
    );

    res.json({
      batchCode: batch.batchCode,
      species: batch.MushroomSpecies.name,
      strainCode: batch.MushroomSpecies.strainCode,
      blockCount: batch.blockCount,
      statusCounts,
      totalYield: totalYield.toFixed(2),
      expectedYield: expectedYield.toFixed(2),
      yieldPercentage: ((totalYield / expectedYield) * 100).toFixed(1),
      totalHarvests,
      receivedDate: batch.receivedDate
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batch summary' });
  }
});

// ========== BLOCKS ==========

// GET /api/batches/blocks/all
router.get('/blocks/all', auth, async (req, res) => {
  try {
    const { status, locationId, speciesId } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (locationId) where.locationId = locationId;

    const include = [
      { 
        model: MushroomBatch, 
        where: { farmId: req.user.farmId },
        include: [{ model: MushroomSpecies, attributes: ['id', 'name', 'strainCode'] }]
      },
      { model: Location, attributes: ['id', 'name', 'code'] }
    ];

    if (speciesId) {
      include[0].include[0].where = { id: speciesId };
    }

    const blocks = await MushroomBlock.findAll({
      where,
      include,
      order: [['incubationStartDate', 'DESC']]
    });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

// GET /api/batches/blocks/:id
router.get('/blocks/:id', auth, async (req, res) => {
  try {
    const block = await MushroomBlock.findByPk(req.params.id, {
      include: [
        { 
          model: MushroomBatch,
          include: [{ model: MushroomSpecies }]
        },
        { model: Location },
        { model: BlockHarvest, order: [['harvestDate', 'DESC']] },
        { 
          model: BlockMovement, 
          include: [
            { model: Location, as: 'FromLocation' },
            { model: Location, as: 'ToLocation' },
            { model: User, as: 'MovedBy', attributes: ['id', 'fullName'] }
          ],
          order: [['movedAt', 'DESC']]
        }
      ]
    });

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch block' });
  }
});

// PUT /api/batches/blocks/:id/status
router.put('/blocks/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const block = await MushroomBlock.findByPk(req.params.id);
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    const updates = { status };
    
    // Set dates based on status
    if (status === 'fruiting' && !block.fruitingStartDate) {
      updates.fruitingStartDate = new Date().toISOString().slice(0, 10);
    }

    await block.update(updates);
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update block status' });
  }
});

// POST /api/batches/blocks/:id/move
router.post('/blocks/:id/move', auth, async (req, res) => {
  try {
    const { toLocationId, reason, notes } = req.body;
    const block = await MushroomBlock.findByPk(req.params.id);
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Create movement record
    await BlockMovement.create({
      blockId: block.id,
      fromLocationId: block.locationId,
      toLocationId,
      movedById: req.user.id,
      reason,
      notes
    });

    // Update block location
    await block.update({ locationId: toLocationId });

    res.json({ message: 'Block moved successfully', block });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move block' });
  }
});

// POST /api/batches/blocks/:id/harvest
router.post('/blocks/:id/harvest', auth, async (req, res) => {
  try {
    const { yieldLbs, quality, notes } = req.body;
    const block = await MushroomBlock.findByPk(req.params.id);
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Create harvest record
    const harvest = await BlockHarvest.create({
      blockId: block.id,
      harvestDate: new Date().toISOString().slice(0, 10),
      flushNumber: block.currentFlush + 1,
      yieldLbs,
      quality: quality || 'A',
      harvestedById: req.user.id,
      notes
    });

    // Update block
    const newTotalYield = parseFloat(block.totalYieldLbs || 0) + parseFloat(yieldLbs);
    await block.update({
      currentFlush: block.currentFlush + 1,
      totalYieldLbs: newTotalYield,
      status: 'resting'
    });

    res.status(201).json(harvest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record harvest' });
  }
});

// POST /api/batches/blocks/bulk-move
router.post('/blocks/bulk-move', auth, async (req, res) => {
  try {
    const { blockIds, toLocationId, reason } = req.body;
    
    const blocks = await MushroomBlock.findAll({
      where: { id: { [Op.in]: blockIds } }
    });

    for (const block of blocks) {
      // Create movement record
      await BlockMovement.create({
        blockId: block.id,
        fromLocationId: block.locationId,
        toLocationId,
        movedById: req.user.id,
        reason
      });

      // Update location
      await block.update({ locationId: toLocationId });
    }

    res.json({ message: `Moved ${blocks.length} blocks` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move blocks' });
  }
});

// POST /api/batches/blocks/bulk-status
router.post('/blocks/bulk-status', auth, async (req, res) => {
  try {
    const { blockIds, status } = req.body;
    
    const updates = { status };
    if (status === 'fruiting') {
      updates.fruitingStartDate = new Date().toISOString().slice(0, 10);
    }

    await MushroomBlock.update(updates, {
      where: { id: { [Op.in]: blockIds } }
    });

    res.json({ message: `Updated ${blockIds.length} blocks to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blocks' });
  }
});

// ========== SUPPLIERS ==========

// GET /api/batches/suppliers
router.get('/suppliers/all', auth, async (req, res) => {
  try {
    const suppliers = await BlockSupplier.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST /api/batches/suppliers
router.post('/suppliers', auth, async (req, res) => {
  try {
    const supplier = await BlockSupplier.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

module.exports = router;
