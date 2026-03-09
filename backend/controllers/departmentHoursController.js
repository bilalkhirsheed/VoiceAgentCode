const supabase = require('../config/supabaseClient');
const { departmentHours } = require('../models');

// POST /api/department-hours
async function createDepartmentHours(req, res) {
  try {
    const dhTable = departmentHours.tableName;
    const dhCols = departmentHours.columns;

    const payload = {
      [dhCols.department_id]: req.body.department_id,
      [dhCols.day_of_week]: req.body.day_of_week,
      [dhCols.open_time]: req.body.open_time || null,
      [dhCols.close_time]: req.body.close_time || null,
      [dhCols.is_closed]: req.body.is_closed ?? false
    };

    const { data, error } = await supabase
      .from(dhTable)
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

// GET /api/departments/:departmentId/hours
async function getDepartmentHours(req, res) {
  try {
    const departmentId = req.params.departmentId;
    const dhTable = departmentHours.tableName;
    const dhCols = departmentHours.columns;

    const { data, error } = await supabase
      .from(dhTable)
      .select('*')
      .eq(dhCols.department_id, departmentId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/department-hours/:id
async function updateDepartmentHours(req, res) {
  try {
    const id = req.params.id;
    const dhTable = departmentHours.tableName;
    const dhCols = departmentHours.columns;

    const payload = {};
    const body = req.body;

    Object.entries(dhCols).forEach(([key, columnName]) => {
      if (key === 'id' || key === 'created_at') return;
      if (body[key] !== undefined) {
        payload[columnName] = body[key];
      }
    });

    const { data, error } = await supabase
      .from(dhTable)
      .update(payload)
      .eq(dhCols.id, id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Department hours not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/department-hours/:id
async function deleteDepartmentHours(req, res) {
  try {
    const id = req.params.id;
    const dhTable = departmentHours.tableName;
    const dhCols = departmentHours.columns;

    const { error } = await supabase
      .from(dhTable)
      .delete()
      .eq(dhCols.id, id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createDepartmentHours,
  getDepartmentHours,
  updateDepartmentHours,
  deleteDepartmentHours
};

