/**
 * FarmFlow v2 - Complete Database Models
 * Enhanced with comprehensive mushroom cultivation parameters
 */

const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'farmflow_db',
  process.env.DB_USER || 'farmflow_user',
  process.env.DB_PASSWORD || 'farmflow_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

// ========== USERS ==========
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  fullName: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'manager', 'worker'), defaultValue: 'worker' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'users', timestamps: true });

// ========== FARM & LOCATIONS ==========
const Farm = sequelize.define('Farm', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT },
  timezone: { type: DataTypes.STRING, defaultValue: 'America/New_York' }
}, { tableName: 'farms', timestamps: true });

const Location = sequelize.define('Location', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true },
  type: { 
    type: DataTypes.ENUM(
      'microgreens_soak', 'microgreens_blackout', 'microgreens_grow', 'microgreens_harvest_pack',
      'mushroom_storage', 'mushroom_incubation', 'mushroom_fruiting', 'cooler', 'other'
    ), 
    allowNull: false 
  },
  targetTemp: { type: DataTypes.DECIMAL(4, 1) },
  targetHumidity: { type: DataTypes.INTEGER },
  targetCO2: { type: DataTypes.INTEGER },
  capacity: { type: DataTypes.INTEGER },
  description: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'locations', timestamps: true });

// ========== CROPS (MICROGREENS) ==========
const Crop = sequelize.define('Crop', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  variety: { type: DataTypes.STRING },
  defaultSowGrams: { type: DataTypes.DECIMAL(10, 2) },
  daysToHarvest: { type: DataTypes.INTEGER, allowNull: false },
  blackoutDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  expectedYieldGrams: { type: DataTypes.DECIMAL(10, 2) },
  soakHours: { type: DataTypes.DECIMAL(5, 1), defaultValue: 0 },
  lightHours: { type: DataTypes.INTEGER, defaultValue: 14 },
  tempMin: { type: DataTypes.INTEGER },
  tempMax: { type: DataTypes.INTEGER },
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'crops', timestamps: true });

// ========== MUSHROOM SPECIES (Enhanced with cultivation parameters) ==========
const MushroomSpecies = sequelize.define('MushroomSpecies', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  // Basic Info
  name: { type: DataTypes.STRING, allowNull: false },
  scientificName: { type: DataTypes.STRING },
  strainCode: { type: DataTypes.STRING, allowNull: false, unique: true },
  group: { type: DataTypes.STRING }, // e.g., "Blue Oyster", "Lion's Mane", "Shiitake"
  
  // Substrate
  substrate: { type: DataTypes.STRING, defaultValue: "Master's mix" },
  substrateNotes: { type: DataTypes.TEXT },
  moisturePercentMin: { type: DataTypes.DECIMAL(4, 1) },
  moisturePercentMax: { type: DataTypes.DECIMAL(4, 1) },
  
  // Incubation Parameters
  incubationDaysMin: { type: DataTypes.INTEGER },
  incubationDaysMax: { type: DataTypes.INTEGER },
  incubationTempMin: { type: DataTypes.INTEGER },
  incubationTempMax: { type: DataTypes.INTEGER },
  incubationNotes: { type: DataTypes.TEXT },
  
  // Fruiting Parameters
  fruitingTempMin: { type: DataTypes.INTEGER },
  fruitingTempMax: { type: DataTypes.INTEGER },
  fruitingHumidityMin: { type: DataTypes.INTEGER },
  fruitingHumidityMax: { type: DataTypes.INTEGER },
  fruitingCO2Min: { type: DataTypes.INTEGER },
  fruitingCO2Max: { type: DataTypes.INTEGER },
  
  // Timing
  daysToFirstHarvest: { type: DataTypes.INTEGER },
  daysToFirstHarvestMax: { type: DataTypes.INTEGER },
  harvestWindowDays: { type: DataTypes.INTEGER },
  totalCycleDays: { type: DataTypes.INTEGER },
  
  // Yield
  yieldPerBlockLbsMin: { type: DataTypes.DECIMAL(4, 2) },
  yieldPerBlockLbsMax: { type: DataTypes.DECIMAL(4, 2) },
  flushCount: { type: DataTypes.INTEGER, defaultValue: 2 },
  
  // Initiation & Technique
  initiationMethod: { type: DataTypes.TEXT }, // How to start fruiting
  fruitingTechnique: { type: DataTypes.TEXT }, // Special steps
  coldShockRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  coldShockTemp: { type: DataTypes.INTEGER },
  coldShockDuration: { type: DataTypes.STRING },
  topFruiting: { type: DataTypes.BOOLEAN, defaultValue: false },
  casingRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  lightRequirements: { type: DataTypes.STRING },
  
  // Difficulty & Notes
  difficulty: { type: DataTypes.ENUM('Beginner', 'Beginner-Int', 'Intermediate', 'Intermediate-Adv', 'Advanced'), defaultValue: 'Intermediate' },
  cultivationNotes: { type: DataTypes.TEXT },
  characteristics: { type: DataTypes.TEXT }, // Shelf life, flavor, appearance notes
  
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'mushroom_species', timestamps: true });

// ========== PRICING ==========
const PriceTier = sequelize.define('PriceTier', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT }
}, { tableName: 'price_tiers', timestamps: true });

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING, unique: true },
  category: { type: DataTypes.ENUM('microgreens', 'mushrooms', 'other'), allowNull: false },
  unit: { type: DataTypes.STRING, defaultValue: 'oz' },
  unitSize: { type: DataTypes.DECIMAL(10, 2) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'products', timestamps: true });

const ProductPrice = sequelize.define('ProductPrice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'product_prices', timestamps: true });

// ========== CUSTOMERS & ORDERS ==========
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  type: { type: DataTypes.ENUM('restaurant', 'retail', 'wholesale', 'farmers_market', 'individual'), defaultValue: 'restaurant' },
  address: { type: DataTypes.TEXT },
  deliveryInstructions: { type: DataTypes.TEXT },
  preferredDeliveryDay: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'customers', timestamps: true });

const Order = sequelize.define('Order', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderNumber: { type: DataTypes.STRING, unique: true },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'), defaultValue: 'pending' },
  
  // Date planning
  dateType: { type: DataTypes.ENUM('harvest', 'start'), defaultValue: 'harvest' },
  harvestDate: { type: DataTypes.DATEONLY },
  startDate: { type: DataTypes.DATEONLY },
  deliveryDate: { type: DataTypes.DATEONLY, allowNull: false },
  deliveryTime: { type: DataTypes.STRING },
  deliveryOffset: { type: DataTypes.INTEGER, defaultValue: 0 }, // Days before harvest (0 = on harvest day)
  
  // Recurring
  isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
  recurringFrequency: { type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'), allowNull: true },
  recurringEndDate: { type: DataTypes.DATEONLY },
  parentOrderId: { type: DataTypes.UUID }, // For recurring order instances
  
  subtotal: { type: DataTypes.DECIMAL(10, 2) },
  tax: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2) },
  notes: { type: DataTypes.TEXT },
  isPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
  paidAt: { type: DataTypes.DATE }
}, { tableName: 'orders', timestamps: true });

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  // For task generation
  cropId: { type: DataTypes.UUID },
  speciesId: { type: DataTypes.UUID },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'order_items', timestamps: true });

const StandingOrder = sequelize.define('StandingOrder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  dayOfWeek: { type: DataTypes.INTEGER, allowNull: false },
  deliveryTime: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'standing_orders', timestamps: true });

// ========== MICROGREEN TRACKING ==========
const SeedLot = sequelize.define('SeedLot', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  lotNumber: { type: DataTypes.STRING, allowNull: false },
  supplier: { type: DataTypes.STRING },
  receivedDate: { type: DataTypes.DATEONLY },
  expirationDate: { type: DataTypes.DATEONLY },
  quantityGrams: { type: DataTypes.DECIMAL(10, 2) },
  remainingGrams: { type: DataTypes.DECIMAL(10, 2) },
  germinationRate: { type: DataTypes.DECIMAL(5, 2) },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'seed_lots', timestamps: true });

const MicrogreenTray = sequelize.define('MicrogreenTray', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  trayCode: { type: DataTypes.STRING, unique: true },
  sowDate: { type: DataTypes.DATEONLY, allowNull: false },
  expectedHarvestDate: { type: DataTypes.DATEONLY },
  actualHarvestDate: { type: DataTypes.DATEONLY },
  seedGrams: { type: DataTypes.DECIMAL(10, 2) },
  status: { type: DataTypes.ENUM('soaking', 'blackout', 'growing', 'ready', 'harvested', 'discarded'), defaultValue: 'soaking' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'microgreen_trays', timestamps: true });

const MicrogreenHarvest = sequelize.define('MicrogreenHarvest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  harvestDate: { type: DataTypes.DATEONLY, allowNull: false },
  yieldGrams: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  quality: { type: DataTypes.ENUM('A', 'B', 'C', 'waste'), defaultValue: 'A' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'microgreen_harvests', timestamps: true });

// ========== MUSHROOM TRACKING ==========
const BlockSupplier = sequelize.define('BlockSupplier', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  contactName: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  website: { type: DataTypes.STRING },
  leadTimeDays: { type: DataTypes.INTEGER },
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'block_suppliers', timestamps: true });

const MushroomBatch = sequelize.define('MushroomBatch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  batchCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  receivedDate: { type: DataTypes.DATEONLY, allowNull: false },
  blockCount: { type: DataTypes.INTEGER, allowNull: false },
  blockWeightLbs: { type: DataTypes.DECIMAL(4, 1), defaultValue: 10 },
  cost: { type: DataTypes.DECIMAL(10, 2) },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'mushroom_batches', timestamps: true });

const MushroomBlock = sequelize.define('MushroomBlock', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  blockCode: { type: DataTypes.STRING, unique: true },
  status: { type: DataTypes.ENUM('incubating', 'ready_to_fruit', 'fruiting', 'resting', 'exhausted', 'contaminated'), defaultValue: 'incubating' },
  incubationStartDate: { type: DataTypes.DATEONLY },
  fruitingStartDate: { type: DataTypes.DATEONLY },
  expectedFruitingDate: { type: DataTypes.DATEONLY },
  currentFlush: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalYieldLbs: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'mushroom_blocks', timestamps: true });

const BlockMovement = sequelize.define('BlockMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  movedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  reason: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'block_movements', timestamps: true });

const BlockHarvest = sequelize.define('BlockHarvest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  harvestDate: { type: DataTypes.DATEONLY, allowNull: false },
  flushNumber: { type: DataTypes.INTEGER, allowNull: false },
  yieldLbs: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
  quality: { type: DataTypes.ENUM('A', 'B', 'C', 'waste'), defaultValue: 'A' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'block_harvests', timestamps: true });

// ========== TASKS ==========
const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.ENUM('microgreens', 'mushrooms', 'orders', 'maintenance', 'other'), defaultValue: 'other' },
  taskType: { type: DataTypes.STRING }, // 'soak', 'sow', 'blackout', 'uncover', 'harvest', 'move_to_fruiting', etc.
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'), defaultValue: 'pending' },
  dueDate: { type: DataTypes.DATEONLY },
  dueTime: { type: DataTypes.STRING },
  completedAt: { type: DataTypes.DATE },
  isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
  recurringPattern: { type: DataTypes.STRING },
  autoGenerated: { type: DataTypes.BOOLEAN, defaultValue: false },
  sourceType: { type: DataTypes.STRING }, // 'block', 'tray', 'order', etc.
  sourceId: { type: DataTypes.UUID },
  
  // Microgreen task details
  cropId: { type: DataTypes.UUID },
  cropName: { type: DataTypes.STRING },
  seedType: { type: DataTypes.STRING },
  trayCount: { type: DataTypes.DECIMAL(10, 2) },
  sowRateOzPerTray: { type: DataTypes.DECIMAL(10, 2) },
  sowRateGPerTray: { type: DataTypes.DECIMAL(10, 2) },
  soakTimeHours: { type: DataTypes.DECIMAL(5, 1) },
  totalSeedWeightOz: { type: DataTypes.DECIMAL(10, 2) },
  totalSeedWeightG: { type: DataTypes.DECIMAL(10, 2) },
  harvestDate: { type: DataTypes.DATEONLY },
  
  // Mushroom task details
  speciesId: { type: DataTypes.UUID },
  speciesName: { type: DataTypes.STRING },
  blockCount: { type: DataTypes.INTEGER },
  expectedYieldLbs: { type: DataTypes.DECIMAL(6, 2) },
  
  notes: { type: DataTypes.TEXT }
}, { tableName: 'tasks', timestamps: true });

// ========== RELATIONSHIPS ==========

// Farm relationships
User.belongsTo(Farm, { foreignKey: 'farmId' });
Farm.hasMany(User, { foreignKey: 'farmId' });
Location.belongsTo(Farm, { foreignKey: 'farmId' });
Farm.hasMany(Location, { foreignKey: 'farmId' });

// Products & Pricing
Product.belongsTo(Crop, { foreignKey: 'cropId' });
Product.belongsTo(MushroomSpecies, { foreignKey: 'speciesId' });
ProductPrice.belongsTo(Product, { foreignKey: 'productId', onDelete: 'CASCADE' });
Product.hasMany(ProductPrice, { foreignKey: 'productId' });
ProductPrice.belongsTo(PriceTier, { foreignKey: 'tierId' });
PriceTier.hasMany(ProductPrice, { foreignKey: 'tierId' });

// Customers & Orders
Customer.belongsTo(Farm, { foreignKey: 'farmId' });
Farm.hasMany(Customer, { foreignKey: 'farmId' });
Customer.belongsTo(PriceTier, { foreignKey: 'priceTierId' });
PriceTier.hasMany(Customer, { foreignKey: 'priceTierId' });

Order.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(Farm, { foreignKey: 'farmId' });
Farm.hasMany(Order, { foreignKey: 'farmId' });

OrderItem.belongsTo(Order, { foreignKey: 'orderId', onDelete: 'CASCADE' });
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

StandingOrder.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(StandingOrder, { foreignKey: 'customerId' });

// Microgreen tracking
SeedLot.belongsTo(Crop, { foreignKey: 'cropId' });
Crop.hasMany(SeedLot, { foreignKey: 'cropId' });

MicrogreenTray.belongsTo(Crop, { foreignKey: 'cropId' });
Crop.hasMany(MicrogreenTray, { foreignKey: 'cropId' });
MicrogreenTray.belongsTo(SeedLot, { foreignKey: 'seedLotId' });
SeedLot.hasMany(MicrogreenTray, { foreignKey: 'seedLotId' });
MicrogreenTray.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(MicrogreenTray, { foreignKey: 'locationId' });

MicrogreenHarvest.belongsTo(MicrogreenTray, { foreignKey: 'trayId', onDelete: 'CASCADE' });
MicrogreenTray.hasMany(MicrogreenHarvest, { foreignKey: 'trayId' });
MicrogreenHarvest.belongsTo(User, { as: 'HarvestedBy', foreignKey: 'harvestedById' });

// Mushroom tracking
MushroomBatch.belongsTo(MushroomSpecies, { foreignKey: 'speciesId' });
MushroomSpecies.hasMany(MushroomBatch, { foreignKey: 'speciesId' });
MushroomBatch.belongsTo(BlockSupplier, { foreignKey: 'supplierId' });
BlockSupplier.hasMany(MushroomBatch, { foreignKey: 'supplierId' });
MushroomBatch.belongsTo(Farm, { foreignKey: 'farmId' });
Farm.hasMany(MushroomBatch, { foreignKey: 'farmId' });

MushroomBlock.belongsTo(MushroomBatch, { foreignKey: 'batchId', onDelete: 'CASCADE' });
MushroomBatch.hasMany(MushroomBlock, { foreignKey: 'batchId' });
MushroomBlock.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(MushroomBlock, { foreignKey: 'locationId' });

BlockMovement.belongsTo(MushroomBlock, { foreignKey: 'blockId', onDelete: 'CASCADE' });
MushroomBlock.hasMany(BlockMovement, { foreignKey: 'blockId' });
BlockMovement.belongsTo(Location, { as: 'FromLocation', foreignKey: 'fromLocationId' });
BlockMovement.belongsTo(Location, { as: 'ToLocation', foreignKey: 'toLocationId' });
BlockMovement.belongsTo(User, { as: 'MovedBy', foreignKey: 'movedById' });

BlockHarvest.belongsTo(MushroomBlock, { foreignKey: 'blockId', onDelete: 'CASCADE' });
MushroomBlock.hasMany(BlockHarvest, { foreignKey: 'blockId' });
BlockHarvest.belongsTo(User, { as: 'HarvestedBy', foreignKey: 'harvestedById' });

// Tasks
Task.belongsTo(Farm, { foreignKey: 'farmId' });
Farm.hasMany(Task, { foreignKey: 'farmId' });
Task.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(Task, { foreignKey: 'locationId' });
Task.belongsTo(User, { as: 'AssignedTo', foreignKey: 'assignedToId' });
Task.belongsTo(User, { as: 'CreatedBy', foreignKey: 'createdById' });

// Export
module.exports = {
  sequelize,
  User,
  Farm,
  Location,
  Crop,
  MushroomSpecies,
  PriceTier,
  Product,
  ProductPrice,
  Customer,
  Order,
  OrderItem,
  StandingOrder,
  SeedLot,
  MicrogreenTray,
  MicrogreenHarvest,
  BlockSupplier,
  MushroomBatch,
  MushroomBlock,
  BlockMovement,
  BlockHarvest,
  Task
};
