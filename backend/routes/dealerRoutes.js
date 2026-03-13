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
const { getDealerDashboard } = require('../controllers/dealerDashboardController');
const { getDealerSummaryReport } = require('../controllers/dealerReportsController');
const { getDealerDepartments } = require('../controllers/departmentController');
const {
  dealerUpdateDepartmentHours,
  dealerCreateHoliday,
  dealerUpdateHoliday,
  dealerDeleteHoliday,
  dealerListHolidays
} = require('../controllers/dealerSelfServiceController');

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

// Dealer self-service editing (used from CRM, scoped by dealer_phone query)
router.put('/dealer/:dealerId/departments/:departmentId/hours', dealerUpdateDepartmentHours);
router.get('/dealer/:dealerId/holidays', dealerListHolidays);
router.post('/dealer/:dealerId/holidays', dealerCreateHoliday);
router.put('/dealer/:dealerId/holidays/:holidayId', dealerUpdateHoliday);
router.delete('/dealer/:dealerId/holidays/:holidayId', dealerDeleteHoliday);

// Dealer config by ID (legacy)
router.get('/dealers/:dealerId/config', getDealerConfig);

// Dealer dashboard by primary phone (DID)
router.get('/dealer-dashboard', getDealerDashboard);

// Dealer reports by primary phone (DID)
router.get('/reports/dealer-summary', getDealerSummaryReport);

module.exports = router;

