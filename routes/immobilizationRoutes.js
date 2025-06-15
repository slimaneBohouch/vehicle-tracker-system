const express = require('express');
const immobilizationController = require('../controllers/immobilizationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(immobilizationController.getAllImmobilizations)
  .post(immobilizationController.createImmobilization);

router
  .route('/:id')
  .get(immobilizationController.getImmobilization)
  .patch(immobilizationController.updateImmobilization)
  .delete(immobilizationController.deleteImmobilization);

module.exports = router;
