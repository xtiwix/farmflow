const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../config/database');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'farmflow-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, farmName, phone } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      farmName,
      phone
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          farmName: user.farmName,
          role: user.role,
          settings: user.settings
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          farmName: user.farmName,
          role: user.role,
          settings: user.settings
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/v1/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, farmName, phone, settings } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (farmName) user.farmName = farmName;
    if (phone) user.phone = phone;
    if (settings) user.settings = { ...user.settings, ...settings };
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        farmName: user.farmName,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
