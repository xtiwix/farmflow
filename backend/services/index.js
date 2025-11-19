/**
 * FarmFlow v3 - Services Index
 */

const authService = require('./authService');
const { orderService, standingOrderService } = require('./orderService');
const { batchService, taskService } = require('./batchService');
const { planningService } = require('./planningService');

module.exports = {
  authService,
  orderService,
  standingOrderService,
  batchService,
  taskService,
  planningService
};
