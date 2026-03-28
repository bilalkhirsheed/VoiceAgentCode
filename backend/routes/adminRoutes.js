const express = require('express');
const { login } = require('../controllers/adminAuthController');
const {
  adminListDealers,
  adminGetMetricsOverview,
  adminGetDealerDetail,
  adminCreateDealer,
  adminUpdateDealer,
  adminDeleteDealer,
  adminCreateDepartment,
  adminUpdateDepartment,
  adminDeleteDepartment,
  adminReplaceDepartmentHours,
  adminUpdateHoursRow,
  adminDeleteHoursRow,
  adminListHolidays,
  adminCreateHoliday,
  adminUpdateHoliday,
  adminDeleteHoliday
} = require('../controllers/adminDealerController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// Public admin login route
router.post('/admin/login', login);

// Admin-only dealer management
router.get('/admin/metrics/overview', requireAdmin, adminGetMetricsOverview);
router.get('/admin/dealers', requireAdmin, adminListDealers);
router.get('/admin/dealers/:dealerId', requireAdmin, adminGetDealerDetail);
router.post('/admin/dealers', requireAdmin, adminCreateDealer);
router.put('/admin/dealers/:dealerId', requireAdmin, adminUpdateDealer);
router.delete('/admin/dealers/:dealerId', requireAdmin, adminDeleteDealer);

// Admin-only departments and hours
router.post('/admin/dealers/:dealerId/departments', requireAdmin, adminCreateDepartment);
router.put('/admin/departments/:departmentId', requireAdmin, adminUpdateDepartment);
router.delete('/admin/departments/:departmentId', requireAdmin, adminDeleteDepartment);

router.post('/admin/departments/:departmentId/hours', requireAdmin, adminReplaceDepartmentHours);
router.put('/admin/hours/:hoursId', requireAdmin, adminUpdateHoursRow);
router.delete('/admin/hours/:hoursId', requireAdmin, adminDeleteHoursRow);

// Admin-only holidays
router.get('/admin/dealers/:dealerId/holidays', requireAdmin, adminListHolidays);
router.post('/admin/dealers/:dealerId/holidays', requireAdmin, adminCreateHoliday);
router.put('/admin/holidays/:holidayId', requireAdmin, adminUpdateHoliday);
router.delete('/admin/holidays/:holidayId', requireAdmin, adminDeleteHoliday);

module.exports = router;

