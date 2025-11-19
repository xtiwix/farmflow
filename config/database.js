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
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// ========== USER MODEL ==========
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  farmName: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  role: {
    type: DataTypes.ENUM('owner', 'manager', 'worker'),
    defaultValue: 'owner'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      weightUnit: 'oz',
      currency: 'USD',
      timezone: 'America/New_York'
    }
  }
}, {
  tableName: 'users',
  timestamps: true
});

// ========== CROP MODEL ==========
const Crop = sequelize.define('Crop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  variety: {
    type: DataTypes.STRING
  },
  category: {
    type: DataTypes.ENUM('microgreens', 'mushrooms'),
    allowNull: false
  },
  growthDays: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Microgreen specific
  soakTime: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  soakRate: {
    type: DataTypes.FLOAT
  },
  soakRateUnit: {
    type: DataTypes.STRING,
    defaultValue: 'oz'
  },
  yieldPerTray: {
    type: DataTypes.FLOAT
  },
  blackoutDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  seedsPerTray: {
    type: DataTypes.INTEGER
  },
  // Mushroom specific
  yieldPerBlock: {
    type: DataTypes.FLOAT
  },
  flushes: {
    type: DataTypes.INTEGER
  },
  fruitingTemp: {
    type: DataTypes.STRING
  },
  humidity: {
    type: DataTypes.STRING
  },
  // Common
  unit: {
    type: DataTypes.STRING,
    defaultValue: 'oz'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'crops',
  timestamps: true
});

// ========== CUSTOMER MODEL ==========
const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  type: {
    type: DataTypes.ENUM('restaurant', 'wholesale', 'farmers_market', 'retail', 'home_delivery'),
    defaultValue: 'restaurant'
  },
  notes: {
    type: DataTypes.TEXT
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'customers',
  timestamps: true
});

// ========== ORDER MODEL ==========
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    unique: true
  },
  dateType: {
    type: DataTypes.ENUM('harvest', 'start'),
    defaultValue: 'harvest'
  },
  targetDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  deliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  deliveryOffset: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT
  },
  // Recurring order fields
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  frequency: {
    type: DataTypes.STRING
  },
  recurringEndDate: {
    type: DataTypes.DATEONLY
  },
  parentOrderId: {
    type: DataTypes.UUID
  }
}, {
  tableName: 'orders',
  timestamps: true
});

// ========== TASK MODEL ==========
const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('soak', 'plant', 'uncover', 'water', 'introduce', 'harvest', 'delivery', 'custom'),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
    defaultValue: 'pending'
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT
  },
  completedAt: {
    type: DataTypes.DATE
  },
  completedBy: {
    type: DataTypes.UUID
  }
}, {
  tableName: 'tasks',
  timestamps: true
});

// ========== BATCH MODEL ==========
const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  batchNumber: {
    type: DataTypes.STRING,
    unique: true
  },
  seedLotNumber: {
    type: DataTypes.STRING
  },
  startDate: {
    type: DataTypes.DATEONLY
  },
  harvestDate: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM('planned', 'growing', 'harvested', 'delivered'),
    defaultValue: 'planned'
  },
  quantity: {
    type: DataTypes.FLOAT
  },
  unit: {
    type: DataTypes.STRING
  },
  actualYield: {
    type: DataTypes.FLOAT
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'batches',
  timestamps: true
});

// ========== ASSOCIATIONS ==========
// User associations
Crop.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Crop, { foreignKey: 'userId' });

Customer.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Customer, { foreignKey: 'userId' });

Order.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Order, { foreignKey: 'userId' });

Task.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Task, { foreignKey: 'userId' });

Batch.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Batch, { foreignKey: 'userId' });

// Order associations
Order.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Order, { foreignKey: 'customerId' });

// Task associations
Task.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(Task, { foreignKey: 'orderId' });

Task.belongsTo(Crop, { foreignKey: 'cropId' });
Crop.hasMany(Task, { foreignKey: 'cropId' });

Task.belongsTo(Batch, { foreignKey: 'batchId' });
Batch.hasMany(Task, { foreignKey: 'batchId' });

// Batch associations
Batch.belongsTo(Crop, { foreignKey: 'cropId' });
Crop.hasMany(Batch, { foreignKey: 'cropId' });

Batch.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(Batch, { foreignKey: 'orderId' });

module.exports = sequelize;
module.exports.User = User;
module.exports.Crop = Crop;
module.exports.Customer = Customer;
module.exports.Order = Order;
module.exports.Task = Task;
module.exports.Batch = Batch;
