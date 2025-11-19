/**
 * FarmFlow v3 - Middleware
 * Authentication, Authorization, and Multi-tenancy
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Account, AccountMember, AccountModule, FeatureFlag } = require('../models');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
      }
    }
    
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

// ============================================================
// MULTI-TENANCY MIDDLEWARE
// ============================================================

/**
 * Load account context from header or query
 */
const loadAccountContext = async (req, res, next) => {
  try {
    const accountId = req.headers['x-account-id'] || req.query.accountId;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Get the account
    const account = await Account.findByPk(accountId);
    
    if (!account || !account.isActive) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    // Check subscription status
    if (account.subscriptionStatus === 'cancelled') {
      return res.status(403).json({ error: 'Account subscription cancelled' });
    }

    // Check if user is member of this account
    const membership = await AccountMember.findOne({
      where: {
        userId: req.userId,
        accountId: accountId,
        isActive: true
      }
    });

    if (!membership && !req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Not a member of this account' });
    }

    // Load enabled modules
    const modules = await AccountModule.findAll({
      where: { accountId, isEnabled: true },
      attributes: ['module', 'config']
    });

    req.account = account;
    req.accountId = accountId;
    req.membership = membership;
    req.userRole = membership ? membership.role : 'owner';
    req.enabledModules = modules.map(m => m.module);
    req.moduleConfigs = modules.reduce((acc, m) => {
      acc[m.module] = m.config;
      return acc;
    }, {});

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================

/**
 * Check if user has required permission
 */
const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const userRole = req.userRole;
      
      // Super admin has all permissions
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Get role permissions
      const roleConfig = config.roles[userRole];
      if (!roleConfig) {
        return res.status(403).json({ error: 'Invalid role' });
      }

      const userPermissions = roleConfig.permissions;

      // Check for wildcard
      if (userPermissions.includes('*')) {
        return next();
      }

      // Check custom permissions override
      const customPermissions = req.membership?.permissions;
      const effectivePermissions = customPermissions || userPermissions;

      // Check each required permission
      for (const required of requiredPermissions) {
        const hasPermission = effectivePermissions.some(perm => {
          if (perm === required) return true;
          
          // Check wildcard patterns (e.g., 'orders:*' matches 'orders:create')
          const [resource, action] = required.split(':');
          if (perm === `${resource}:*`) return true;
          
          return false;
        });

        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Permission denied',
            required: required 
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if account has required module enabled
 */
const requireModule = (...requiredModules) => {
  return (req, res, next) => {
    const enabledModules = req.enabledModules || [];

    for (const module of requiredModules) {
      if (!enabledModules.includes(module)) {
        return res.status(403).json({
          error: 'Module not enabled',
          module: module,
          message: `This feature requires the ${module} module`
        });
      }
    }

    next();
  };
};

/**
 * Check if feature flag is enabled for account
 */
const requireFeatureFlag = (flagKey) => {
  return async (req, res, next) => {
    try {
      const flag = await FeatureFlag.findOne({ where: { key: flagKey } });
      
      if (!flag) {
        return res.status(403).json({ 
          error: 'Feature not available',
          feature: flagKey 
        });
      }

      // Check account override
      if (req.accountId && flag.accountOverrides[req.accountId] !== undefined) {
        if (flag.accountOverrides[req.accountId]) {
          return next();
        } else {
          return res.status(403).json({ 
            error: 'Feature disabled for this account',
            feature: flagKey 
          });
        }
      }

      // Check user override
      if (req.userId && flag.userOverrides[req.userId] !== undefined) {
        if (flag.userOverrides[req.userId]) {
          return next();
        } else {
          return res.status(403).json({ 
            error: 'Feature disabled for this user',
            feature: flagKey 
          });
        }
      }

      // Check global setting
      if (flag.isEnabled) {
        return next();
      }

      // Check rollout percentage
      if (flag.rolloutPercentage > 0 && req.accountId) {
        const hash = simpleHash(req.accountId + flagKey);
        if (hash % 100 < flag.rolloutPercentage) {
          return next();
        }
      }

      return res.status(403).json({ 
        error: 'Feature not enabled',
        feature: flagKey 
      });
    } catch (error) {
      next(error);
    }
  };
};

// Simple hash function for rollout percentage
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================================
// LIMIT CHECKING MIDDLEWARE
// ============================================================

/**
 * Check account limits (users, locations, etc.)
 */
const checkLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const account = req.account;
      
      let currentCount = 0;
      let maxAllowed = 0;

      switch (limitType) {
        case 'users':
          currentCount = await AccountMember.count({ 
            where: { accountId: req.accountId, isActive: true } 
          });
          maxAllowed = account.maxUsers;
          break;
          
        case 'locations':
          const { Location } = require('../models');
          currentCount = await Location.count({ 
            where: { accountId: req.accountId, isActive: true } 
          });
          maxAllowed = account.maxLocations;
          break;
          
        case 'productionUnits':
          const { ProductionBatch } = require('../models');
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0, 0, 0, 0);
          
          currentCount = await ProductionBatch.count({
            where: {
              accountId: req.accountId,
              createdAt: { [require('sequelize').Op.gte]: thisMonth }
            }
          });
          maxAllowed = account.maxProductionUnits;
          break;
          
        case 'orders':
          const { Order } = require('../models');
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          currentCount = await Order.count({
            where: {
              accountId: req.accountId,
              createdAt: { [require('sequelize').Op.gte]: monthStart }
            }
          });
          maxAllowed = account.maxOrders;
          break;
          
        default:
          return next();
      }

      // -1 means unlimited
      if (maxAllowed !== -1 && currentCount >= maxAllowed) {
        return res.status(403).json({
          error: 'Limit reached',
          limitType,
          current: currentCount,
          max: maxAllowed,
          message: `You've reached your ${limitType} limit. Please upgrade your plan.`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
};

// ============================================================
// UTILITY MIDDLEWARE
// ============================================================

/**
 * Add pagination to request
 */
const paginate = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(
    parseInt(req.query.limit) || config.pagination.defaultLimit,
    config.pagination.maxLimit
  );
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
};

/**
 * Request logging
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

module.exports = {
  // Auth
  authenticate,
  optionalAuth,
  
  // Multi-tenancy
  loadAccountContext,
  
  // Authorization
  requirePermission,
  requireModule,
  requireFeatureFlag,
  checkLimit,
  
  // Error handling
  errorHandler,
  notFound,
  
  // Utilities
  paginate,
  requestLogger
};
