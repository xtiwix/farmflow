/**
 * FarmFlow v3 - Auth Controller
 */

const { authService } = require('../services');

const authController = {
  /**
   * POST /auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      next(error);
    }
  },

  /**
   * POST /auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  /**
   * POST /auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * POST /auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.userId, 
        currentPassword, 
        newPassword
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * GET /auth/me
   */
  async me(req, res, next) {
    try {
      const { User, AccountMember, Account } = require('../models');
      
      const user = await User.findByPk(req.userId, {
        attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
      });

      const memberships = await AccountMember.findAll({
        where: { userId: req.userId, isActive: true },
        include: [{ model: Account, where: { isActive: true } }]
      });

      const accounts = memberships.map(m => ({
        id: m.Account.id,
        name: m.Account.name,
        slug: m.Account.slug,
        role: m.role
      }));

      res.json({ user, accounts });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
