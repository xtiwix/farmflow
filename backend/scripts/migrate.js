require('dotenv').config();
const sequelize = require('../config/database');

const migrate = async () => {
  try {
    console.log('Running database migrations...');
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
