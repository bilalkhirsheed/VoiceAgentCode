const express = require('express');
const {
  createDepartment,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const {
  createDepartmentHours,
  getDepartmentHours,
  updateDepartmentHours,
  deleteDepartmentHours
} = require('../controllers/departmentHoursController');

const router = express.Router();

// Department CRUD
router.post('/departments', createDepartment);
router.get('/departments/:departmentId', getDepartmentById);
router.put('/departments/:departmentId', updateDepartment);
router.delete('/departments/:departmentId', deleteDepartment);

// Department hours
router.post('/department-hours', createDepartmentHours);
router.get('/departments/:departmentId/hours', getDepartmentHours);
router.put('/department-hours/:id', updateDepartmentHours);
router.delete('/department-hours/:id', deleteDepartmentHours);

module.exports = router;

