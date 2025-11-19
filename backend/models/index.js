/**
 * FarmFlow v3 - Database Models
 * Phase 1: All Epics P1-1 through P1-7
 */

const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'farmflow_v3',
  process.env.DB_USER || 'farmflow_user',
  process.env.DB_PASSWORD || 'farmflow_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 20, min: 0, acquire: 30000, idle: 10000 }
  }
);

// ============================================================
// P1-1: MULTI-TENANCY & ACCOUNT SYSTEM
// ============================================================

// Account (Tenant) - Each farm operation
const Account = sequelize.define('Account', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  // Basic Info
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true, allowNull: false },
  
  // Contact
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  website: { type: DataTypes.STRING },
  
  // Address
  address: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  zipCode: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING, defaultValue: 'US' },
  timezone: { type: DataTypes.STRING, defaultValue: 'America/New_York' },
  
  // Subscription
  subscriptionTier: { 
    type: DataTypes.ENUM('free', 'starter', 'pro', 'enterprise'), 
    defaultValue: 'free' 
  },
  subscriptionStatus: {
    type: DataTypes.ENUM('active', 'trialing', 'past_due', 'cancelled', 'paused'),
    defaultValue: 'trialing'
  },
  trialEndsAt: { type: DataTypes.DATE },
  subscriptionEndsAt: { type: DataTypes.DATE },
  stripeCustomerId: { type: DataTypes.STRING },
  stripeSubscriptionId: { type: DataTypes.STRING },
  
  // Limits based on tier
  maxUsers: { type: DataTypes.INTEGER, defaultValue: 1 },
  maxLocations: { type: DataTypes.INTEGER, defaultValue: 3 },
  maxProductionUnits: { type: DataTypes.INTEGER, defaultValue: 100 },
  maxOrders: { type: DataTypes.INTEGER, defaultValue: 50 },
  
  // Settings
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      weightUnit: 'oz',
      temperatureUnit: 'F'
    }
  },
  
  // Branding
  logoUrl: { type: DataTypes.STRING },
  primaryColor: { type: DataTypes.STRING, defaultValue: '#10B981' },
  
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  deletedAt: { type: DataTypes.DATE }
}, {
  tableName: 'accounts',
  timestamps: true,
  paranoid: true
});

// User - Individual users (can belong to multiple accounts)
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  avatarUrl: { type: DataTypes.STRING },
  
  // Global user settings
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      theme: 'light',
      notifications: { email: true, push: true, sms: false }
    }
  },
  
  // Auth
  emailVerifiedAt: { type: DataTypes.DATE },
  lastLoginAt: { type: DataTypes.DATE },
  passwordResetToken: { type: DataTypes.STRING },
  passwordResetExpires: { type: DataTypes.DATE },
  
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isSuperAdmin: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'users',
  timestamps: true
});

// AccountMember - User membership in an account
const AccountMember = sequelize.define('AccountMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'manager', 'worker', 'viewer'),
    defaultValue: 'worker'
  },
  
  // Permissions override (null = use role defaults)
  permissions: { type: DataTypes.JSONB },
  
  // Member-specific settings for this account
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'account_members',
  timestamps: true
});

// AccountInvitation - Pending invitations
const AccountInvitation = sequelize.define('AccountInvitation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  email: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'manager', 'worker', 'viewer'), defaultValue: 'worker' },
  
  token: { type: DataTypes.STRING, unique: true, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  
  acceptedAt: { type: DataTypes.DATE },
  declinedAt: { type: DataTypes.DATE }
}, {
  tableName: 'account_invitations',
  timestamps: true
});

// AccountModule - Enabled modules per account
const AccountModule = sequelize.define('AccountModule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  module: {
    type: DataTypes.ENUM(
      'microgreens',
      'mushrooms', 
      'standing_orders',
      'advanced_planning',
      'qr_tracking',
      'reporting',
      'api_access',
      'multi_location',
      'team_management',
      'customer_portal'
    ),
    allowNull: false
  },
  
  isEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  enabledAt: { type: DataTypes.DATE },
  
  // Module-specific configuration
  config: { type: DataTypes.JSONB, defaultValue: {} }
}, {
  tableName: 'account_modules',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['accountId', 'module'] }
  ]
});

// FeatureFlag - Global and per-account feature flags
const FeatureFlag = sequelize.define('FeatureFlag', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  key: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  
  // Global default
  isEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  // Rollout percentage (0-100)
  rolloutPercentage: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Account-specific overrides (accountId -> enabled)
  accountOverrides: { type: DataTypes.JSONB, defaultValue: {} },
  
  // User-specific overrides
  userOverrides: { type: DataTypes.JSONB, defaultValue: {} },
  
  // Environment restrictions
  environments: { 
    type: DataTypes.ARRAY(DataTypes.STRING), 
    defaultValue: ['development', 'staging', 'production'] 
  }
}, {
  tableName: 'feature_flags',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['key'] }
  ]
});

// ============================================================
// P1-2: PRODUCTION SYSTEM
// ============================================================

// Location - Physical spaces within an account
const Location = sequelize.define('Location', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING },
  type: {
    type: DataTypes.ENUM(
      'soak_station', 'blackout_room', 'grow_room', 'harvest_area', 'pack_room',
      'incubation_room', 'fruiting_room', 'cold_storage', 'dry_storage', 
      'shipping_area', 'office', 'other'
    ),
    allowNull: false
  },
  
  // Environmental targets
  targetTemp: { type: DataTypes.DECIMAL(5, 2) },
  targetHumidity: { type: DataTypes.INTEGER },
  targetCO2: { type: DataTypes.INTEGER },
  targetLightHours: { type: DataTypes.INTEGER },
  
  // Capacity
  capacity: { type: DataTypes.INTEGER },
  capacityUnit: { type: DataTypes.STRING, defaultValue: 'trays' },
  
  // QR Code
  qrCode: { type: DataTypes.STRING },
  
  description: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'locations',
  timestamps: true
});

// CropType - Generic crop definition
const CropType = sequelize.define('CropType', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  name: { type: DataTypes.STRING, allowNull: false },
  category: {
    type: DataTypes.ENUM('microgreen', 'mushroom', 'vegetable', 'herb', 'other'),
    allowNull: false
  },
  
  // Growing parameters
  growthDays: { type: DataTypes.INTEGER },
  blackoutDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  harvestWindowDays: { type: DataTypes.INTEGER, defaultValue: 2 },
  
  // Yield estimates
  expectedYield: { type: DataTypes.DECIMAL(10, 2) },
  yieldUnit: { type: DataTypes.STRING, defaultValue: 'oz' },
  
  // Environmental requirements
  idealTemp: { type: DataTypes.DECIMAL(5, 2) },
  idealHumidity: { type: DataTypes.INTEGER },
  lightHours: { type: DataTypes.INTEGER },
  
  // Mushroom-specific
  mushroomType: { type: DataTypes.STRING },
  flushCount: { type: DataTypes.INTEGER },
  daysPerFlush: { type: DataTypes.INTEGER },
  
  // Microgreen-specific
  seedDensity: { type: DataTypes.DECIMAL(10, 2) },
  seedDensityUnit: { type: DataTypes.STRING },
  soakHours: { type: DataTypes.INTEGER },
  stackingDays: { type: DataTypes.INTEGER },
  
  // Pricing
  suggestedPrice: { type: DataTypes.DECIMAL(10, 2) },
  priceUnit: { type: DataTypes.STRING },
  
  // Notes
  growingNotes: { type: DataTypes.TEXT },
  harvestingNotes: { type: DataTypes.TEXT },
  
  color: { type: DataTypes.STRING },
  imageUrl: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'crop_types',
  timestamps: true
});

// Product - Sellable products
const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  
  // Pricing
  basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit: { type: DataTypes.STRING, allowNull: false },
  
  // Tiered pricing
  priceTiers: {
    type: DataTypes.JSONB,
    defaultValue: []
    // [{ name: 'Restaurant', discount: 10 }, { name: 'Wholesale', discount: 20 }]
  },
  
  // Inventory
  trackInventory: { type: DataTypes.BOOLEAN, defaultValue: false },
  currentStock: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  lowStockThreshold: { type: DataTypes.DECIMAL(10, 2) },
  
  imageUrl: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'products',
  timestamps: true
});

// ============================================================
// P1-3: CUSTOMERS & ORDERS
// ============================================================

// Customer
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  // Basic info
  name: { type: DataTypes.STRING, allowNull: false },
  type: {
    type: DataTypes.ENUM('restaurant', 'retail', 'wholesale', 'farmers_market', 'individual', 'other'),
    defaultValue: 'restaurant'
  },
  
  // Contact
  contactName: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  
  // Address
  address: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  zipCode: { type: DataTypes.STRING },
  
  // Delivery
  deliveryInstructions: { type: DataTypes.TEXT },
  preferredDeliveryDays: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [] },
  preferredDeliveryTime: { type: DataTypes.STRING },
  
  // Billing
  priceTier: { type: DataTypes.STRING },
  paymentTerms: { type: DataTypes.STRING, defaultValue: 'net_30' },
  taxExempt: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'customers',
  timestamps: true
});

// Order
const Order = sequelize.define('Order', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  orderNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  
  status: {
    type: DataTypes.ENUM('draft', 'confirmed', 'in_production', 'ready', 'out_for_delivery', 'delivered', 'cancelled'),
    defaultValue: 'draft'
  },
  
  // Dates
  orderDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  deliveryDate: { type: DataTypes.DATEONLY, allowNull: false },
  deliveryTime: { type: DataTypes.STRING },
  
  // Totals
  subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tax: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  
  // Payment
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded'),
    defaultValue: 'pending'
  },
  paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  paidAt: { type: DataTypes.DATE },
  
  // Delivery
  deliveryAddress: { type: DataTypes.STRING },
  deliveryInstructions: { type: DataTypes.TEXT },
  deliveredAt: { type: DataTypes.DATE },
  
  // Source tracking
  source: {
    type: DataTypes.ENUM('manual', 'standing_order', 'customer_portal', 'api'),
    defaultValue: 'manual'
  },
  
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'orders',
  timestamps: true
});

// OrderItem
const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'order_items',
  timestamps: true
});

// StandingOrder - Recurring order templates
const StandingOrder = sequelize.define('StandingOrder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  name: { type: DataTypes.STRING },
  
  // Schedule
  frequency: {
    type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
    defaultValue: 'weekly'
  },
  deliveryDays: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [] },
  deliveryTime: { type: DataTypes.STRING },
  
  // Auto-generation
  autoGenerate: { type: DataTypes.BOOLEAN, defaultValue: true },
  generateDaysAhead: { type: DataTypes.INTEGER, defaultValue: 7 },
  lastGeneratedAt: { type: DataTypes.DATE },
  
  // Date range
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY },
  
  // Pause capability
  isPaused: { type: DataTypes.BOOLEAN, defaultValue: false },
  pausedUntil: { type: DataTypes.DATEONLY },
  
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'standing_orders',
  timestamps: true
});

// StandingOrderItem
const StandingOrderItem = sequelize.define('StandingOrderItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, {
  tableName: 'standing_order_items',
  timestamps: true
});

// ============================================================
// P1-4 & P1-5: PRODUCTION TRACKING
// ============================================================

// ProductionBatch - Unified batch tracking
const ProductionBatch = sequelize.define('ProductionBatch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  batchCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  
  // Type
  productionType: {
    type: DataTypes.ENUM('microgreens_tray', 'mushroom_in_house', 'mushroom_rtf'),
    allowNull: false
  },
  
  // Status workflow
  status: {
    type: DataTypes.ENUM(
      'planned', 'soaking', 'planted', 'blackout', 'growing', 'ready_to_harvest',
      'harvesting', 'harvested', 'disposed', 'cancelled'
    ),
    defaultValue: 'planned'
  },
  
  // Quantities
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  quantityUnit: { type: DataTypes.STRING, defaultValue: 'trays' },
  
  // Timeline
  plannedSowDate: { type: DataTypes.DATEONLY },
  actualSowDate: { type: DataTypes.DATEONLY },
  plannedHarvestDate: { type: DataTypes.DATEONLY },
  actualHarvestDate: { type: DataTypes.DATEONLY },
  
  // Yield tracking
  expectedYield: { type: DataTypes.DECIMAL(10, 2) },
  actualYield: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  yieldUnit: { type: DataTypes.STRING, defaultValue: 'oz' },
  
  // Mushroom-specific
  currentFlush: { type: DataTypes.INTEGER, defaultValue: 1 },
  maxFlushes: { type: DataTypes.INTEGER },
  rtfSupplier: { type: DataTypes.STRING },
  rtfReceivedDate: { type: DataTypes.DATEONLY },
  
  // Microgreen-specific
  traySize: { type: DataTypes.STRING },
  seedLot: { type: DataTypes.STRING },
  seedWeight: { type: DataTypes.DECIMAL(10, 2) },
  
  // Environmental data
  environmentalLog: { type: DataTypes.JSONB, defaultValue: [] },
  
  // QR Code
  qrCode: { type: DataTypes.STRING },
  
  notes: { type: DataTypes.TEXT },
  
  // Costs
  seedCost: { type: DataTypes.DECIMAL(10, 2) },
  laborCost: { type: DataTypes.DECIMAL(10, 2) },
  materialCost: { type: DataTypes.DECIMAL(10, 2) },
  totalCost: { type: DataTypes.DECIMAL(10, 2) }
}, {
  tableName: 'production_batches',
  timestamps: true
});

// BatchHarvest - Individual harvests from a batch
const BatchHarvest = sequelize.define('BatchHarvest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  harvestDate: { type: DataTypes.DATEONLY, allowNull: false },
  harvestTime: { type: DataTypes.TIME },
  
  // Quantity
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit: { type: DataTypes.STRING, defaultValue: 'oz' },
  
  // Quality
  qualityGrade: {
    type: DataTypes.ENUM('A', 'B', 'C', 'waste'),
    defaultValue: 'A'
  },
  qualityNotes: { type: DataTypes.TEXT },
  
  // For mushrooms
  flushNumber: { type: DataTypes.INTEGER },
  
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'batch_harvests',
  timestamps: true
});

// BatchMovement - Track batch movements between locations
const BatchMovement = sequelize.define('BatchMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  movedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  reason: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'batch_movements',
  timestamps: true
});

// ============================================================
// P1-6: TASK MANAGEMENT
// ============================================================

// Task
const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  
  // Type and priority
  type: {
    type: DataTypes.ENUM(
      'sow', 'water', 'harvest', 'move', 'clean', 'maintain', 
      'delivery', 'pack', 'inspect', 'record', 'other'
    ),
    defaultValue: 'other'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  
  // Scheduling
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  dueTime: { type: DataTypes.TIME },
  estimatedMinutes: { type: DataTypes.INTEGER },
  
  // Status
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled', 'skipped'),
    defaultValue: 'pending'
  },
  completedAt: { type: DataTypes.DATE },
  actualMinutes: { type: DataTypes.INTEGER },
  
  // Recurrence
  isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
  recurrenceRule: { type: DataTypes.STRING },
  
  // QR workflow
  requiresQrScan: { type: DataTypes.BOOLEAN, defaultValue: false },
  qrScannedAt: { type: DataTypes.DATE },
  
  // Source tracking
  source: {
    type: DataTypes.ENUM('manual', 'auto_batch', 'auto_order', 'auto_standing', 'recurring'),
    defaultValue: 'manual'
  },
  
  notes: { type: DataTypes.TEXT },
  completionNotes: { type: DataTypes.TEXT }
}, {
  tableName: 'tasks',
  timestamps: true
});

// ============================================================
// AUDIT & LOGGING
// ============================================================

// ActivityLog - Track all changes
const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  
  action: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'other'),
    allowNull: false
  },
  
  entityType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.UUID },
  
  // Changes
  previousData: { type: DataTypes.JSONB },
  newData: { type: DataTypes.JSONB },
  
  // Context
  ipAddress: { type: DataTypes.STRING },
  userAgent: { type: DataTypes.STRING },
  
  description: { type: DataTypes.STRING }
}, {
  tableName: 'activity_logs',
  timestamps: true,
  updatedAt: false
});

// ============================================================
// ASSOCIATIONS
// ============================================================

// AccountMember (User <-> Account many-to-many)
User.belongsToMany(Account, { through: AccountMember, foreignKey: 'userId' });
Account.belongsToMany(User, { through: AccountMember, foreignKey: 'accountId' });
AccountMember.belongsTo(User, { foreignKey: 'userId' });
AccountMember.belongsTo(Account, { foreignKey: 'accountId' });

// AccountInvitation
AccountInvitation.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(AccountInvitation, { foreignKey: 'accountId' });
AccountInvitation.belongsTo(User, { as: 'InvitedBy', foreignKey: 'invitedById' });

// AccountModule
AccountModule.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(AccountModule, { foreignKey: 'accountId' });

// Location
Location.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(Location, { foreignKey: 'accountId' });

// CropType
CropType.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(CropType, { foreignKey: 'accountId' });

// Product
Product.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(Product, { foreignKey: 'accountId' });
Product.belongsTo(CropType, { foreignKey: 'cropTypeId' });
CropType.hasMany(Product, { foreignKey: 'cropTypeId' });

// Customer
Customer.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(Customer, { foreignKey: 'accountId' });

// Order
Order.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(Order, { foreignKey: 'accountId' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(User, { as: 'CreatedBy', foreignKey: 'createdById' });
Order.belongsTo(StandingOrder, { foreignKey: 'standingOrderId' });
StandingOrder.hasMany(Order, { foreignKey: 'standingOrderId' });

// OrderItem
OrderItem.belongsTo(Order, { foreignKey: 'orderId', onDelete: 'CASCADE' });
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

// StandingOrder
StandingOrder.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(StandingOrder, { foreignKey: 'accountId' });
StandingOrder.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(StandingOrder, { foreignKey: 'customerId' });

// StandingOrderItem
StandingOrderItem.belongsTo(StandingOrder, { foreignKey: 'standingOrderId', onDelete: 'CASCADE' });
StandingOrder.hasMany(StandingOrderItem, { foreignKey: 'standingOrderId' });
StandingOrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(StandingOrderItem, { foreignKey: 'productId' });

// ProductionBatch
ProductionBatch.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(ProductionBatch, { foreignKey: 'accountId' });
ProductionBatch.belongsTo(CropType, { foreignKey: 'cropTypeId' });
CropType.hasMany(ProductionBatch, { foreignKey: 'cropTypeId' });
ProductionBatch.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(ProductionBatch, { foreignKey: 'locationId' });
ProductionBatch.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(ProductionBatch, { foreignKey: 'orderId' });

// BatchHarvest
BatchHarvest.belongsTo(ProductionBatch, { foreignKey: 'batchId', onDelete: 'CASCADE' });
ProductionBatch.hasMany(BatchHarvest, { foreignKey: 'batchId' });
BatchHarvest.belongsTo(User, { as: 'HarvestedBy', foreignKey: 'harvestedById' });

// BatchMovement
BatchMovement.belongsTo(ProductionBatch, { foreignKey: 'batchId', onDelete: 'CASCADE' });
ProductionBatch.hasMany(BatchMovement, { foreignKey: 'batchId' });
BatchMovement.belongsTo(Location, { as: 'FromLocation', foreignKey: 'fromLocationId' });
BatchMovement.belongsTo(Location, { as: 'ToLocation', foreignKey: 'toLocationId' });
BatchMovement.belongsTo(User, { as: 'MovedBy', foreignKey: 'movedById' });

// Task
Task.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(Task, { foreignKey: 'accountId' });
Task.belongsTo(User, { as: 'AssignedTo', foreignKey: 'assignedToId' });
Task.belongsTo(User, { as: 'CompletedBy', foreignKey: 'completedById' });
Task.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(Task, { foreignKey: 'locationId' });
Task.belongsTo(ProductionBatch, { foreignKey: 'batchId' });
ProductionBatch.hasMany(Task, { foreignKey: 'batchId' });
Task.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(Task, { foreignKey: 'orderId' });

// ActivityLog
ActivityLog.belongsTo(Account, { foreignKey: 'accountId' });
Account.hasMany(ActivityLog, { foreignKey: 'accountId' });
ActivityLog.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ActivityLog, { foreignKey: 'userId' });

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sequelize,
  
  // P1-1: Multi-tenancy
  Account,
  User,
  AccountMember,
  AccountInvitation,
  AccountModule,
  FeatureFlag,
  
  // P1-2: Production
  Location,
  CropType,
  Product,
  
  // P1-3: Customers & Orders
  Customer,
  Order,
  OrderItem,
  StandingOrder,
  StandingOrderItem,
  
  // P1-4 & P1-5: Production Tracking
  ProductionBatch,
  BatchHarvest,
  BatchMovement,
  
  // P1-6: Tasks
  Task,
  
  // Audit
  ActivityLog
};
