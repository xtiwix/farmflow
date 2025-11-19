/**
 * FarmFlow v3 - Auth Service
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { User, Account, AccountMember, AccountModule, AccountInvitation, sequelize } = require('../models');

class AuthService {
  /**
   * Register new user and create account
   */
  async register({ email, password, firstName, lastName, accountName, phone }) {
    const transaction = await sequelize.transaction();

    try {
      // Check if email exists
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        emailVerifiedAt: new Date() // Auto-verify for now
      }, { transaction });

      // Create account
      const slug = this.generateSlug(accountName);
      const account = await Account.create({
        name: accountName,
        slug,
        email,
        phone,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 day trial
      }, { transaction });

      // Create membership as owner
      await AccountMember.create({
        userId: user.id,
        accountId: account.id,
        role: 'owner',
        joinedAt: new Date()
      }, { transaction });

      // Enable default modules
      const tierConfig = config.subscriptionTiers[account.subscriptionTier];
      for (const module of tierConfig.modules) {
        await AccountModule.create({
          accountId: account.id,
          module,
          isEnabled: true,
          enabledAt: new Date()
        }, { transaction });
      }

      await transaction.commit();

      // Generate token
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      return {
        user: this.sanitizeUser(user),
        account,
        token,
        refreshToken
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Get user's accounts
    const memberships = await AccountMember.findAll({
      where: { userId: user.id, isActive: true },
      include: [{ model: Account, where: { isActive: true } }]
    });

    const accounts = memberships.map(m => ({
      id: m.Account.id,
      name: m.Account.name,
      slug: m.Account.slug,
      role: m.role
    }));

    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: this.sanitizeUser(user),
      accounts,
      token,
      refreshToken
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      const newToken = this.generateToken(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id);

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If an account exists, a reset email will be sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    });

    // TODO: Send email with reset link
    // For now, return token (in production, send via email)
    return { 
      message: 'Password reset email sent',
      resetToken // Remove this in production
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    return { message: 'Password reset successful' };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
    await user.update({ password: hashedPassword });

    return { message: 'Password changed successfully' };
  }

  // Helper methods
  generateToken(userId) {
    return jwt.sign(
      { userId, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' + Math.random().toString(36).substring(2, 8);
  }

  sanitizeUser(user) {
    const { password, passwordResetToken, passwordResetExpires, ...sanitized } = user.toJSON();
    return sanitized;
  }
}

module.exports = new AuthService();
