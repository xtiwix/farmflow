/**
 * FarmFlow v3 - Database Seed Script
 * Run: node scripts/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  Account, User, AccountMember, AccountModule,
  Location, CropType, Product, Customer, FeatureFlag
} = require('../models');

const seedDatabase = async () => {
  console.log('\n🌱 FarmFlow v3 Database Seed\n');
  console.log('═'.repeat(50));

  try {
    // Sync database
    await sequelize.sync({ force: true });
    console.log('✅ Database synced (tables recreated)\n');

    // ========================================
    // CREATE USER & ACCOUNT
    // ========================================
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const user = await User.create({
      email: 'demo@brightoasisfarm.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      phone: '555-123-4567',
      emailVerifiedAt: new Date()
    });
    console.log('✅ Demo user created');

    const account = await Account.create({
      name: 'Bright Oasis Farm',
      slug: 'bright-oasis-farm',
      email: 'demo@brightoasisfarm.com',
      phone: '555-123-4567',
      address: '123 Farm Lane',
      city: 'Milford',
      state: 'MA',
      zipCode: '01757',
      timezone: 'America/New_York',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      maxUsers: 10,
      maxLocations: 10,
      maxProductionUnits: 2000,
      maxOrders: 1000
    });
    console.log('✅ Demo account created');

    await AccountMember.create({
      userId: user.id,
      accountId: account.id,
      role: 'owner',
      joinedAt: new Date()
    });

    // Enable modules
    const modules = [
      'microgreens', 'mushrooms', 'standing_orders', 'advanced_planning',
      'qr_tracking', 'reporting', 'multi_location', 'team_management'
    ];
    
    for (const module of modules) {
      await AccountModule.create({
        accountId: account.id,
        module,
        isEnabled: true,
        enabledAt: new Date()
      });
    }
    console.log('✅ Modules enabled');

    // ========================================
    // CREATE LOCATIONS
    // ========================================
    
    const locations = [
      { name: 'Soak Station', type: 'soak_station', code: 'SS-1' },
      { name: 'Blackout Room A', type: 'blackout_room', code: 'BR-A', capacity: 100, capacityUnit: 'trays', targetTemp: 70, targetHumidity: 60 },
      { name: 'Blackout Room B', type: 'blackout_room', code: 'BR-B', capacity: 100, capacityUnit: 'trays', targetTemp: 70, targetHumidity: 60 },
      { name: 'Grow Room 1', type: 'grow_room', code: 'GR-1', capacity: 200, capacityUnit: 'trays', targetTemp: 68, targetHumidity: 50, targetLightHours: 16 },
      { name: 'Grow Room 2', type: 'grow_room', code: 'GR-2', capacity: 200, capacityUnit: 'trays', targetTemp: 68, targetHumidity: 50, targetLightHours: 16 },
      { name: 'Incubation Room', type: 'incubation_room', code: 'IR-1', capacity: 500, capacityUnit: 'blocks', targetTemp: 75, targetHumidity: 85 },
      { name: 'Fruiting Room A', type: 'fruiting_room', code: 'FR-A', capacity: 200, capacityUnit: 'blocks', targetTemp: 60, targetHumidity: 90, targetCO2: 800 },
      { name: 'Fruiting Room B', type: 'fruiting_room', code: 'FR-B', capacity: 200, capacityUnit: 'blocks', targetTemp: 65, targetHumidity: 85, targetCO2: 1000 },
      { name: 'Harvest Area', type: 'harvest_area', code: 'HA-1' },
      { name: 'Cold Storage', type: 'cold_storage', code: 'CS-1', targetTemp: 38 },
      { name: 'Pack Room', type: 'pack_room', code: 'PR-1' }
    ];

    for (const loc of locations) {
      await Location.create({ ...loc, accountId: account.id });
    }
    console.log(`✅ ${locations.length} locations created`);

    // ========================================
    // CREATE CROP TYPES - MICROGREENS
    // ========================================
    
    const microgreens = [
      // Popular varieties
      { name: 'Sunflower', growthDays: 8, blackoutDays: 3, expectedYield: 10, seedDensity: 1.5, seedDensityUnit: 'oz/tray', soakHours: 8, suggestedPrice: 3.50, color: '#FFD700' },
      { name: 'Pea Shoots', growthDays: 10, blackoutDays: 3, expectedYield: 8, seedDensity: 2, seedDensityUnit: 'oz/tray', soakHours: 8, suggestedPrice: 4.00, color: '#90EE90' },
      { name: 'Radish', growthDays: 6, blackoutDays: 2, expectedYield: 6, seedDensity: 1, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 3.00, color: '#FF6B6B' },
      { name: 'Broccoli', growthDays: 7, blackoutDays: 3, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 4.00, color: '#228B22' },
      { name: 'Kale', growthDays: 8, blackoutDays: 3, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 4.00, color: '#006400' },
      { name: 'Arugula', growthDays: 7, blackoutDays: 2, expectedYield: 4, seedDensity: 0.5, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 3.50, color: '#32CD32' },
      { name: 'Mustard', growthDays: 6, blackoutDays: 2, expectedYield: 4, seedDensity: 0.5, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 3.00, color: '#9ACD32' },
      { name: 'Cilantro', growthDays: 14, blackoutDays: 4, expectedYield: 4, seedDensity: 1.5, seedDensityUnit: 'oz/tray', soakHours: 8, suggestedPrice: 5.00, color: '#3CB371' },
      { name: 'Basil', growthDays: 12, blackoutDays: 3, expectedYield: 3, seedDensity: 0.5, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 5.00, color: '#2E8B57' },
      { name: 'Wheatgrass', growthDays: 8, blackoutDays: 2, expectedYield: 12, seedDensity: 3, seedDensityUnit: 'oz/tray', soakHours: 8, suggestedPrice: 3.00, color: '#7CFC00' },
      { name: 'Buckwheat', growthDays: 7, blackoutDays: 2, expectedYield: 6, seedDensity: 2, seedDensityUnit: 'oz/tray', soakHours: 4, suggestedPrice: 4.00, color: '#8FBC8F' },
      { name: 'Amaranth', growthDays: 8, blackoutDays: 3, expectedYield: 3, seedDensity: 0.25, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 5.00, color: '#DC143C' },
      { name: 'Beet', growthDays: 10, blackoutDays: 4, expectedYield: 5, seedDensity: 1.5, seedDensityUnit: 'oz/tray', soakHours: 8, suggestedPrice: 4.50, color: '#8B0000' },
      { name: 'Chard', growthDays: 10, blackoutDays: 3, expectedYield: 5, seedDensity: 1, seedDensityUnit: 'oz/tray', soakHours: 4, suggestedPrice: 4.00, color: '#FF4500' },
      { name: 'Cabbage', growthDays: 7, blackoutDays: 3, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 3.50, color: '#9370DB' },
      
      // Premium/specialty
      { name: 'Micro Mix', growthDays: 7, blackoutDays: 3, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 4.50, color: '#20B2AA' },
      { name: 'Spicy Mix', growthDays: 6, blackoutDays: 2, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 4.00, color: '#FF6347' },
      { name: 'Salad Mix', growthDays: 8, blackoutDays: 3, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 4.00, color: '#98FB98' },
      { name: 'Kohlrabi', growthDays: 7, blackoutDays: 3, expectedYield: 5, seedDensity: 0.75, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 4.00, color: '#DDA0DD' },
      { name: 'Dill', growthDays: 14, blackoutDays: 4, expectedYield: 3, seedDensity: 0.5, seedDensityUnit: 'oz/tray', soakHours: 0, suggestedPrice: 5.50, color: '#9ACD32' }
    ];

    for (const crop of microgreens) {
      await CropType.create({
        ...crop,
        accountId: account.id,
        category: 'microgreen',
        yieldUnit: 'oz',
        priceUnit: 'oz',
        idealTemp: 68,
        idealHumidity: 50,
        harvestWindowDays: 2
      });
    }
    console.log(`✅ ${microgreens.length} microgreen varieties created`);

    // ========================================
    // CREATE CROP TYPES - MUSHROOMS
    // ========================================
    
    const mushrooms = [
      { 
        name: 'Blue Oyster', 
        mushroomType: 'oyster',
        expectedYield: 16, 
        daysPerFlush: 7, 
        flushCount: 3,
        idealTemp: 60, 
        idealHumidity: 90,
        suggestedPrice: 12.00,
        growingNotes: 'Prefers cooler temps. High humidity critical during pinning.',
        color: '#4169E1'
      },
      { 
        name: 'Golden Oyster', 
        mushroomType: 'oyster',
        expectedYield: 12, 
        daysPerFlush: 7, 
        flushCount: 2,
        idealTemp: 75, 
        idealHumidity: 85,
        suggestedPrice: 14.00,
        growingNotes: 'Heat loving. Beautiful golden color when fresh.',
        color: '#FFD700'
      },
      { 
        name: 'Pink Oyster', 
        mushroomType: 'oyster',
        expectedYield: 12, 
        daysPerFlush: 5, 
        flushCount: 2,
        idealTemp: 75, 
        idealHumidity: 85,
        suggestedPrice: 14.00,
        growingNotes: 'Fast growing, heat loving. Short shelf life.',
        color: '#FF69B4'
      },
      { 
        name: 'King Oyster', 
        mushroomType: 'oyster',
        expectedYield: 12, 
        daysPerFlush: 14, 
        flushCount: 2,
        idealTemp: 60, 
        idealHumidity: 85,
        suggestedPrice: 16.00,
        growingNotes: 'Thick stems, small caps. High CO2 tolerance.',
        color: '#F5F5DC'
      },
      { 
        name: "Lion's Mane", 
        mushroomType: 'lionsmane',
        expectedYield: 10, 
        daysPerFlush: 14, 
        flushCount: 2,
        idealTemp: 65, 
        idealHumidity: 90,
        suggestedPrice: 18.00,
        growingNotes: 'Needs high humidity and fresh air. Avoid direct misting.',
        color: '#FFFAF0'
      },
      { 
        name: 'Shiitake', 
        mushroomType: 'shiitake',
        expectedYield: 8, 
        daysPerFlush: 14, 
        flushCount: 4,
        idealTemp: 65, 
        idealHumidity: 80,
        suggestedPrice: 14.00,
        growingNotes: 'Long colonization. Benefits from cold shock between flushes.',
        color: '#8B4513'
      },
      { 
        name: 'Chestnut', 
        mushroomType: 'chestnut',
        expectedYield: 10, 
        daysPerFlush: 10, 
        flushCount: 2,
        idealTemp: 60, 
        idealHumidity: 85,
        suggestedPrice: 15.00,
        growingNotes: 'Mild nutty flavor. Good shelf life.',
        color: '#D2691E'
      },
      { 
        name: 'Maitake', 
        mushroomType: 'maitake',
        expectedYield: 12, 
        daysPerFlush: 21, 
        flushCount: 1,
        idealTemp: 60, 
        idealHumidity: 90,
        suggestedPrice: 20.00,
        growingNotes: 'Slow growing but premium pricing. Harvest before spores release.',
        color: '#696969'
      },
      { 
        name: 'Pioppino', 
        mushroomType: 'pioppino',
        expectedYield: 8, 
        daysPerFlush: 14, 
        flushCount: 2,
        idealTemp: 60, 
        idealHumidity: 85,
        suggestedPrice: 16.00,
        growingNotes: 'Crunchy texture. Needs good fresh air exchange.',
        color: '#A0522D'
      },
      { 
        name: 'Black Pearl Oyster', 
        mushroomType: 'oyster',
        expectedYield: 14, 
        daysPerFlush: 8, 
        flushCount: 3,
        idealTemp: 65, 
        idealHumidity: 85,
        suggestedPrice: 13.00,
        growingNotes: 'Hybrid variety. Good balance of yield and flavor.',
        color: '#2F4F4F'
      }
    ];

    for (const crop of mushrooms) {
      await CropType.create({
        ...crop,
        accountId: account.id,
        category: 'mushroom',
        yieldUnit: 'oz',
        priceUnit: 'lb',
        harvestWindowDays: 3
      });
    }
    console.log(`✅ ${mushrooms.length} mushroom varieties created`);

    // ========================================
    // CREATE PRODUCTS
    // ========================================
    
    const cropTypes = await CropType.findAll({ where: { accountId: account.id } });
    
    for (const crop of cropTypes) {
      // Standard product
      await Product.create({
        accountId: account.id,
        cropTypeId: crop.id,
        name: crop.name,
        sku: crop.category === 'mushroom' 
          ? `MU-${crop.name.substring(0, 3).toUpperCase()}`
          : `MG-${crop.name.substring(0, 3).toUpperCase()}`,
        basePrice: crop.suggestedPrice,
        unit: crop.category === 'mushroom' ? 'lb' : 'oz',
        priceTiers: [
          { name: 'Restaurant', discount: 10 },
          { name: 'Wholesale', discount: 20 }
        ]
      });
    }
    console.log(`✅ ${cropTypes.length} products created`);

    // ========================================
    // CREATE SAMPLE CUSTOMERS
    // ========================================
    
    const customers = [
      { name: 'Farm to Table Restaurant', type: 'restaurant', contactName: 'Chef Maria', email: 'maria@farmtotable.com', phone: '555-111-2222', priceTier: 'Restaurant', preferredDeliveryDays: [2, 5] },
      { name: 'Green Leaf Cafe', type: 'restaurant', contactName: 'Tom Wilson', email: 'tom@greenleaf.com', phone: '555-222-3333', priceTier: 'Restaurant', preferredDeliveryDays: [1, 4] },
      { name: 'Healthy Harvest Market', type: 'retail', contactName: 'Sarah Chen', email: 'sarah@healthyharvest.com', phone: '555-333-4444', priceTier: 'Wholesale', preferredDeliveryDays: [2] },
      { name: 'The Mushroom Bistro', type: 'restaurant', contactName: 'Chef Paul', email: 'paul@mushroombistro.com', phone: '555-444-5555', priceTier: 'Restaurant', preferredDeliveryDays: [3, 6] },
      { name: 'Wellness Kitchen', type: 'restaurant', contactName: 'Amy Davis', email: 'amy@wellnesskitchen.com', phone: '555-555-6666', priceTier: 'Restaurant', preferredDeliveryDays: [2, 4] },
      { name: 'Weekend Farmers Market', type: 'farmers_market', contactName: 'Market Manager', email: 'manager@weekendmarket.com', phone: '555-666-7777', preferredDeliveryDays: [6] },
      { name: 'Local Co-op', type: 'retail', contactName: 'Jake Brown', email: 'jake@localcoop.com', phone: '555-777-8888', priceTier: 'Wholesale', preferredDeliveryDays: [1, 3, 5] }
    ];

    for (const customer of customers) {
      await Customer.create({
        ...customer,
        accountId: account.id,
        address: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101'
      });
    }
    console.log(`✅ ${customers.length} customers created`);

    // ========================================
    // CREATE FEATURE FLAGS
    // ========================================
    
    const featureFlags = [
      { key: 'new_dashboard', name: 'New Dashboard UI', isEnabled: true },
      { key: 'advanced_analytics', name: 'Advanced Analytics', isEnabled: false, rolloutPercentage: 25 },
      { key: 'mobile_scanner', name: 'Mobile QR Scanner', isEnabled: true },
      { key: 'ai_planning', name: 'AI-Powered Planning', isEnabled: false }
    ];

    for (const flag of featureFlags) {
      await FeatureFlag.create(flag);
    }
    console.log(`✅ ${featureFlags.length} feature flags created`);

    // ========================================
    // SUMMARY
    // ========================================
    
    console.log('\n' + '═'.repeat(50));
    console.log('✅ Database seeding complete!\n');
    console.log('Demo Credentials:');
    console.log('  Email: demo@brightoasisfarm.com');
    console.log('  Password: password123');
    console.log('  Account ID:', account.id);
    console.log('\n' + '═'.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
