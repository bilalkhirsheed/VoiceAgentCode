const supabase = require('../config/supabaseClient');
const { department, departmentHours } = require('../models');

// POST /api/departments
async function createDepartment(req, res) {
  try {
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const payload = {
      [deptCols.dealer_id]: req.body.dealer_id,
      [deptCols.department_name]: req.body.department_name,
      [deptCols.transfer_phone]: req.body.transfer_phone || null,
      [deptCols.transfer_type]: req.body.transfer_type || 'pstn',
      [deptCols.after_hours_action]: req.body.after_hours_action || null
    };

    const { data, error } = await supabase
      .from(deptTable)
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dealers/:dealerId/departments
async function getDealerDepartments(req, res) {
  try {
    const dealerId = req.params.dealerId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const { data, error } = await supabase
      .from(deptTable)
      .select('*')
      .eq(deptCols.dealer_id, dealerId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/departments/:departmentId
async function getDepartmentById(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const { data, error } = await supabase
      .from(deptTable)
      .select('*')
      .eq(deptCols.id, departmentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/departments/:departmentId
async function updateDepartment(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const payload = {};
    const body = req.body;

    Object.entries(deptCols).forEach(([key, columnName]) => {
      if (key === 'id' || key === 'created_at') return;
      if (body[key] !== undefined) {
        payload[columnName] = body[key];
      }
    });

    const { data, error } = await supabase
      .from(deptTable)
      .update(payload)
      .eq(deptCols.id, departmentId)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/departments/:departmentId
async function deleteDepartment(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const { error } = await supabase
      .from(deptTable)
      .delete()
      .eq(deptCols.id, departmentId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Optionally: also delete department hours (cascade can handle this in DB)
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Department Hours controllers are in separate file but we re-export helper here if needed.
// This file focuses on department core CRUD.

module.exports = {
  createDepartment,
  getDealerDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};

