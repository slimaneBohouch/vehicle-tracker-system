const express = require('express');
const {
  createAlertRule,
  getAlertRules,
  getAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule
} = require('../controllers/alertRuleController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// CRUD routes
router.route('/')
  .get(getAlertRules)
  .post(createAlertRule);

router.route('/:id')
  .get(getAlertRule)
  .put(updateAlertRule)
  .delete(deleteAlertRule);

// Toggle enable/disable
router.route('/:id/toggle')
  .patch(toggleAlertRule);

module.exports = router;
