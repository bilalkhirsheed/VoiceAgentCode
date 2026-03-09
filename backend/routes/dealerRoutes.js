const express = require('express');
const {
  createDealer,
  getAllDealers,
  getDealerById,
  updateDealer,
  deleteDealer,
  getDealerConfig,
  getDealerConfigByDid,
  getDealerOpenStatusByDid
} = require('../controllers/dealerController');
const { getDealerDepartments } = require('../controllers/departmentController');

const router = express.Router();

// Dealer config by DID (phone number) — used by Retell
router.get('/dealer-config/:did', getDealerConfigByDid);

// Dealer open/close status by DID (phone number) and department name
router.get('/dealer-open-status/:did/:departmentName', getDealerOpenStatusByDid);

// Dealer CRUD
router.post('/dealers', createDealer);
router.get('/dealers', getAllDealers);
router.get('/dealers/:dealerId', getDealerById);
router.put('/dealers/:dealerId', updateDealer);
router.delete('/dealers/:dealerId', deleteDealer);

// Dealer departments
router.get('/dealers/:dealerId/departments', getDealerDepartments);

// Dealer config by ID (legacy)
router.get('/dealers/:dealerId/config', getDealerConfig);

module.exports = router;

