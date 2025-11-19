/**
 * FarmFlow v2 Database Setup & Seed
 * Handles existing data gracefully - only seeds if database is empty
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { 
  sequelize, User, Farm, Location, Crop, MushroomSpecies,
  Customer, PriceTier, Product, ProductPrice, BlockSupplier
} = require('../models');

const seedDatabase = async () => {
  console.log('\n🌱 FarmFlow v2 Database Setup\n');
  console.log('═'.repeat(50));
  
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database schema synced\n');

    // Check if already seeded
    const existingFarm = await Farm.findOne();
    if (existingFarm) {
      console.log('ℹ️  Database already seeded, skipping...');
      console.log('🔐 Login: admin@farmflow.com / farmflow123\n');
      return;
    }

    // Create Farm
    const farm = await Farm.create({
      name: 'Bright Oasis Farm',
      address: 'Milford, MA',
      timezone: 'America/New_York'
    });

    // Locations
    await Location.bulkCreate([
      { farmId: farm.id, name: 'Soak Station', code: 'LOC-SOAK', type: 'microgreens_soak' },
      { farmId: farm.id, name: 'Blackout Rack', code: 'LOC-BO', type: 'microgreens_blackout' },
      { farmId: farm.id, name: 'Grow Room', code: 'LOC-GR', type: 'microgreens_grow', targetTemp: 68 },
      { farmId: farm.id, name: 'Incubation Room', code: 'LOC-INC', type: 'mushroom_incubation', targetTemp: 66, targetHumidity: 70 },
      { farmId: farm.id, name: 'Fruiting Room', code: 'LOC-FR', type: 'mushroom_fruiting', targetTemp: 58, targetHumidity: 92, targetCO2: 600 },
      { farmId: farm.id, name: 'Walk-in Cooler', code: 'LOC-WIC', type: 'cooler', targetTemp: 36 }
    ]);

    // Users
    const hashedPassword = await bcrypt.hash('farmflow123', 12);
    await User.bulkCreate([
      { farmId: farm.id, email: 'admin@farmflow.com', password: hashedPassword, fullName: 'Farm Admin', role: 'admin' },
      { farmId: farm.id, email: 'worker@farmflow.com', password: hashedPassword, fullName: 'Farm Worker', role: 'worker' }
    ]);

    // Price Tiers
    const tiers = await PriceTier.bulkCreate([
      { name: 'Retail', description: 'Direct to consumer' },
      { name: 'Restaurant', description: 'Restaurant pricing' },
      { name: 'Wholesale', description: 'Bulk pricing' }
    ]);

    // Crops
    const crops = await Crop.bulkCreate([
      { name: 'Radish', variety: 'Daikon', defaultSowGrams: 85, daysToHarvest: 6, blackoutDays: 3, expectedYieldGrams: 280, soakHours: 8 },
      { name: 'Sunflower', variety: 'Black Oil', defaultSowGrams: 200, daysToHarvest: 10, blackoutDays: 4, expectedYieldGrams: 350, soakHours: 12 },
      { name: 'Pea Shoots', variety: 'Speckled', defaultSowGrams: 200, daysToHarvest: 10, blackoutDays: 3, expectedYieldGrams: 300, soakHours: 12 },
      { name: 'Broccoli', variety: 'Waltham', defaultSowGrams: 30, daysToHarvest: 8, blackoutDays: 3, expectedYieldGrams: 200, soakHours: 8 },
      { name: 'Arugula', variety: 'Standard', defaultSowGrams: 25, daysToHarvest: 8, blackoutDays: 2, expectedYieldGrams: 150, soakHours: 0 },
      { name: 'Spicy Mix', variety: 'House', defaultSowGrams: 50, daysToHarvest: 7, blackoutDays: 3, expectedYieldGrams: 190, soakHours: 6 }
    ]);

    // Mushroom Species
    const species = await MushroomSpecies.bulkCreate([
      {
        name: 'Blue Oyster', scientificName: 'Pleurotus ostreatus', strainCode: 'PO-CNS', group: 'Blue Oyster',
        substrate: "Master's mix", moisturePercentMin: 61, moisturePercentMax: 61,
        incubationDaysMin: 7, incubationDaysMax: 14, incubationTempMax: 80,
        fruitingTempMin: 60, fruitingTempMax: 65, fruitingHumidityMin: 90, fruitingHumidityMax: 95,
        daysToFirstHarvest: 7, daysToFirstHarvestMax: 14, harvestWindowDays: 3,
        yieldPerBlockLbsMin: 2.5, yieldPerBlockLbsMax: 3.5, difficulty: 'Beginner',
        initiationMethod: 'Move to 60-65°F, make x-cuts ≤½"',
        cultivationNotes: 'Pins fast. Great shelf life when grown cold.'
      },
      {
        name: 'Lions Mane', scientificName: 'Hericium erinaceus', strainCode: 'HE-CNS', group: 'Lions Mane',
        substrate: "Master's mix", moisturePercentMin: 59, moisturePercentMax: 60,
        incubationDaysMin: 8, incubationDaysMax: 16, incubationTempMax: 73,
        fruitingTempMin: 55, fruitingTempMax: 65, fruitingHumidityMin: 90, fruitingHumidityMax: 95,
        daysToFirstHarvest: 10, daysToFirstHarvestMax: 21, harvestWindowDays: 3,
        yieldPerBlockLbsMin: 2.5, yieldPerBlockLbsMax: 3.5, flushCount: 2, difficulty: 'Intermediate',
        initiationMethod: 'Move to 55-65°F with strong FAE, x-cut on top',
        cultivationNotes: 'Very sensitive to moisture and heat.'
      },
      {
        name: 'King Oyster', scientificName: 'Pleurotus eryngii', strainCode: 'PE-KONG', group: 'King Oyster',
        substrate: "Master's mix", moisturePercentMin: 60, moisturePercentMax: 63,
        incubationDaysMin: 14, incubationDaysMax: 21,
        fruitingTempMin: 50, fruitingTempMax: 60, fruitingHumidityMin: 85, fruitingHumidityMax: 95,
        daysToFirstHarvest: 10, daysToFirstHarvestMax: 18, harvestWindowDays: 5,
        yieldPerBlockLbsMin: 2.0, yieldPerBlockLbsMax: 2.5, difficulty: 'Intermediate', topFruiting: true,
        initiationMethod: 'Top-fruit, let pins form in-bag then cut top',
        cultivationNotes: 'Excellent shelf life; very meaty stems.'
      },
      {
        name: 'Pink Oyster', scientificName: 'Pleurotus djamor', strainCode: 'PD-1', group: 'Pink Oyster',
        substrate: "Master's mix", moisturePercentMin: 60, moisturePercentMax: 63,
        incubationDaysMin: 10, incubationDaysMax: 16,
        fruitingTempMin: 70, fruitingTempMax: 80, fruitingHumidityMin: 85, fruitingHumidityMax: 95,
        daysToFirstHarvest: 5, daysToFirstHarvestMax: 10, harvestWindowDays: 2,
        yieldPerBlockLbsMin: 2.5, yieldPerBlockLbsMax: 3.0, flushCount: 3, difficulty: 'Beginner-Int',
        initiationMethod: 'Move to warm room 70-80°F, x-cuts ≤½"',
        cultivationNotes: 'Vivid color; very short shelf life.'
      },
      {
        name: 'Shiitake', scientificName: 'Lentinula edodes', strainCode: 'LE-3790', group: 'Shiitake',
        substrate: '70-80% hardwood + 20-30% bran', moisturePercentMin: 63, moisturePercentMax: 65,
        incubationDaysMin: 14, incubationDaysMax: 21,
        fruitingTempMin: 55, fruitingTempMax: 66, fruitingHumidityMin: 85, fruitingHumidityMax: 95,
        daysToFirstHarvest: 7, daysToFirstHarvestMax: 14, harvestWindowDays: 4, totalCycleDays: 98,
        yieldPerBlockLbsMin: 3.0, yieldPerBlockLbsMax: 4.0, difficulty: 'Intermediate', coldShockRequired: true,
        initiationMethod: 'Brown 11-14 weeks, cold shock/soak, fruit 55-66°F',
        cultivationNotes: 'Highest-yield shiitake strain.'
      },
      {
        name: 'Gold Oyster', scientificName: 'Pleurotus citrinopileatus', strainCode: 'PC-MM', group: 'Gold Oyster',
        substrate: "Master's mix", moisturePercentMin: 60, moisturePercentMax: 63,
        incubationDaysMin: 7, incubationDaysMax: 14,
        fruitingTempMin: 65, fruitingTempMax: 70, fruitingHumidityMin: 85, fruitingHumidityMax: 95,
        daysToFirstHarvest: 7, daysToFirstHarvestMax: 14, harvestWindowDays: 3,
        yieldPerBlockLbsMin: 2.5, yieldPerBlockLbsMax: 3.5, flushCount: 3, difficulty: 'Intermediate',
        lightRequirements: 'Flood lighting',
        initiationMethod: 'Bring to 65-70°F with bright light, small x-cuts',
        cultivationNotes: 'Wants warm temps and bright light. Mediocre shelf life.'
      },
      {
        name: 'Chestnut', scientificName: 'Pholiota adiposa', strainCode: 'PA-CNS', group: 'Chestnut',
        substrate: "Master's mix", moisturePercentMin: 61, moisturePercentMax: 63,
        incubationDaysMin: 21, incubationDaysMax: 28,
        fruitingTempMin: 55, fruitingTempMax: 65, fruitingHumidityMin: 90, fruitingHumidityMax: 95,
        daysToFirstHarvest: 14, daysToFirstHarvestMax: 21, harvestWindowDays: 5,
        yieldPerBlockLbsMin: 2.0, yieldPerBlockLbsMax: 3.0, difficulty: 'Intermediate',
        initiationMethod: 'After 3-4 weeks incubation, move to 55-65°F, deep cut',
        cultivationNotes: 'Very conditions-sensitive. Won\'t pin >65°F.'
      }
    ]);

    // Supplier
    await BlockSupplier.create({
      name: 'Cap N Stem', website: 'https://www.capnstem.com', leadTimeDays: 7, isActive: true
    });

    // Customers
    const restaurantTier = tiers.find(t => t.name === 'Restaurant');
    const wholesaleTier = tiers.find(t => t.name === 'Wholesale');
    const retailTier = tiers.find(t => t.name === 'Retail');

    await Customer.bulkCreate([
      { farmId: farm.id, priceTierId: restaurantTier.id, name: 'The Green Table', email: 'chef@greentable.com', phone: '555-0101', type: 'restaurant', preferredDeliveryDay: 'Tuesday' },
      { farmId: farm.id, priceTierId: restaurantTier.id, name: 'Farm & Fork', email: 'orders@farmandfork.com', phone: '555-0102', type: 'restaurant', preferredDeliveryDay: 'Wednesday' },
      { farmId: farm.id, priceTierId: wholesaleTier.id, name: 'Local Foods Co', email: 'buying@localfoods.com', phone: '555-0201', type: 'wholesale', preferredDeliveryDay: 'Monday' },
      { farmId: farm.id, priceTierId: retailTier.id, name: 'Saturday Market', phone: '555-0301', type: 'farmers_market', preferredDeliveryDay: 'Saturday' }
    ]);

    // Products
    const products = await Product.bulkCreate([
      { name: 'Pea Shoots 4oz', sku: 'MG-PEA-4', category: 'microgreens', unit: 'clamshell', unitSize: 4 },
      { name: 'Sunflower 4oz', sku: 'MG-SUN-4', category: 'microgreens', unit: 'clamshell', unitSize: 4 },
      { name: 'Spicy Mix 2oz', sku: 'MG-SPY-2', category: 'microgreens', unit: 'clamshell', unitSize: 2 },
      { name: 'Blue Oyster 8oz', sku: 'MSH-BLU-8', category: 'mushrooms', unit: 'bag', unitSize: 8 },
      { name: 'Lions Mane 8oz', sku: 'MSH-LM-8', category: 'mushrooms', unit: 'bag', unitSize: 8 },
      { name: 'King Oyster 8oz', sku: 'MSH-KNG-8', category: 'mushrooms', unit: 'bag', unitSize: 8 }
    ]);

    // Product Prices
    const priceData = [];
    for (const product of products) {
      const basePrice = product.category === 'microgreens' ? (product.unitSize === 4 ? 6.00 : 4.00) : 8.00;
      priceData.push({ productId: product.id, tierId: retailTier.id, price: basePrice * 1.25 });
      priceData.push({ productId: product.id, tierId: restaurantTier.id, price: basePrice });
      priceData.push({ productId: product.id, tierId: wholesaleTier.id, price: basePrice * 0.75 });
    }
    await ProductPrice.bulkCreate(priceData);

    console.log('✅ Database seeded successfully!');
    console.log('🔐 Login: admin@farmflow.com / farmflow123\n');

  } catch (error) {
    console.error('❌ Seed error:', error.message);
  } finally {
    await sequelize.close();
  }
};

seedDatabase();
