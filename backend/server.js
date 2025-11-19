/**
 * FarmFlow v3 - Main Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const { errorHandler, notFound, requestLogger } = require('./middleware');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '3.0.0',
    timestamp: new Date().toISOString() 
  });
});

// API routes
app.use(routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// ============================================================
// DATABASE & SERVER START
// ============================================================

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models (use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🌱 FarmFlow v3 API Server                           ║
║                                                       ║
║   Port: ${PORT}                                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}                       ║
║                                                       ║
║   Endpoints:                                          ║
║   - Health: GET /health                               ║
║   - Auth: POST /auth/login, /auth/register            ║
║   - API: /api/* (requires auth + account context)     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
