/**
 * FarmFlow v3 - Configuration
 */

module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'farmflow-v3-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Password hashing
  bcrypt: {
    saltRounds: 12
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },

  // Role permissions
  roles: {
    owner: {
      permissions: ['*'],
      description: 'Full access to everything'
    },
    admin: {
      permissions: [
        'account:read', 'account:update',
        'users:*', 'invitations:*',
        'modules:read',
        'locations:*', 'crops:*', 'products:*',
        'customers:*', 'orders:*', 'standing_orders:*',
        'batches:*', 'tasks:*',
        'reports:*', 'export:*'
      ],
      description: 'Administrative access'
    },
    manager: {
      permissions: [
        'account:read',
        'users:read',
        'locations:*', 'crops:*', 'products:*',
        'customers:*', 'orders:*', 'standing_orders:*',
        'batches:*', 'tasks:*',
        'reports:read', 'export:read'
      ],
      description: 'Manager access'
    },
    worker: {
      permissions: [
        'locations:read',
        'crops:read', 'products:read',
        'customers:read', 'orders:read',
        'batches:read', 'batches:update',
        'tasks:read', 'tasks:update'
      ],
      description: 'Worker access'
    },
    viewer: {
      permissions: [
        'account:read',
        'locations:read', 'crops:read', 'products:read',
        'customers:read', 'orders:read',
        'batches:read', 'tasks:read',
        'reports:read'
      ],
      description: 'Read-only access'
    }
  },

  // Subscription tiers
  subscriptionTiers: {
    free: {
      name: 'Free',
      maxUsers: 1,
      maxLocations: 3,
      maxProductionUnits: 100,
      maxOrders: 50,
      modules: ['microgreens', 'mushrooms'],
      features: ['basic_reporting'],
      price: 0
    },
    starter: {
      name: 'Starter',
      maxUsers: 3,
      maxLocations: 5,
      maxProductionUnits: 500,
      maxOrders: 200,
      modules: ['microgreens', 'mushrooms', 'standing_orders', 'qr_tracking'],
      features: ['basic_reporting', 'csv_export'],
      price: 29
    },
    pro: {
      name: 'Professional',
      maxUsers: 10,
      maxLocations: 10,
      maxProductionUnits: 2000,
      maxOrders: 1000,
      modules: [
        'microgreens', 'mushrooms', 'standing_orders', 'advanced_planning',
        'qr_tracking', 'reporting', 'multi_location', 'team_management'
      ],
      features: ['advanced_reporting', 'csv_export', 'api_access'],
      price: 79
    },
    enterprise: {
      name: 'Enterprise',
      maxUsers: -1, // unlimited
      maxLocations: -1,
      maxProductionUnits: -1,
      maxOrders: -1,
      modules: [
        'microgreens', 'mushrooms', 'standing_orders', 'advanced_planning',
        'qr_tracking', 'reporting', 'api_access', 'multi_location',
        'team_management', 'customer_portal'
      ],
      features: ['*'],
      price: 199
    }
  },

  // Module definitions
  modules: {
    microgreens: {
      name: 'Microgreens',
      description: 'Manage microgreen trays, growing cycles, and harvests'
    },
    mushrooms: {
      name: 'Mushrooms',
      description: 'Track mushroom blocks, flushes, and yields'
    },
    standing_orders: {
      name: 'Standing Orders',
      description: 'Recurring order management with auto-generation'
    },
    advanced_planning: {
      name: 'Advanced Planning',
      description: 'Sowing planner with demand forecasting'
    },
    qr_tracking: {
      name: 'QR Tracking',
      description: 'QR code workflows for batches and locations'
    },
    reporting: {
      name: 'Reporting',
      description: 'Advanced reports and analytics'
    },
    api_access: {
      name: 'API Access',
      description: 'REST API for integrations'
    },
    multi_location: {
      name: 'Multi-Location',
      description: 'Manage multiple farm locations'
    },
    team_management: {
      name: 'Team Management',
      description: 'Advanced user roles and permissions'
    },
    customer_portal: {
      name: 'Customer Portal',
      description: 'Self-service portal for customers'
    }
  },

  // Batch status workflows
  batchWorkflows: {
    microgreens_tray: [
      'planned', 'soaking', 'planted', 'blackout', 'growing', 
      'ready_to_harvest', 'harvesting', 'harvested'
    ],
    mushroom_in_house: [
      'planned', 'inoculated', 'incubating', 'fruiting', 
      'ready_to_harvest', 'harvesting', 'harvested'
    ],
    mushroom_rtf: [
      'planned', 'received', 'fruiting', 
      'ready_to_harvest', 'harvesting', 'harvested'
    ]
  },

  // Task auto-generation templates
  taskTemplates: {
    microgreens_tray: [
      { offset: 0, type: 'sow', title: 'Sow {crop}', estimatedMinutes: 15 },
      { offset: 0, type: 'water', title: 'Initial watering - {crop}', estimatedMinutes: 5 },
      { offset: '{blackoutDays}', type: 'move', title: 'Move {crop} to grow room', estimatedMinutes: 10 },
      { offset: '{growthDays}', type: 'harvest', title: 'Harvest {crop}', estimatedMinutes: 20 }
    ],
    mushroom_rtf: [
      { offset: 0, type: 'record', title: 'Receive RTF blocks - {crop}', estimatedMinutes: 15 },
      { offset: 0, type: 'move', title: 'Move to fruiting room - {crop}', estimatedMinutes: 10 },
      { offset: '{daysToPin}', type: 'inspect', title: 'Check for pins - {crop}', estimatedMinutes: 5 },
      { offset: '{daysToHarvest}', type: 'harvest', title: 'Harvest {crop} - Flush 1', estimatedMinutes: 30 }
    ]
  }
};
