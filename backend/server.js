const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Server running successfully 🚀');
});

// API routes
const dealerRoutes = require('./routes/dealerRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const leadRoutes = require('./routes/leadRoutes');
const callbackRoutes = require('./routes/callbackRoutes');
const callRoutes = require('./routes/callRoutes');
const retellRoutes = require('./routes/retellRoutes');
const serviceBookingRoutes = require('./routes/serviceBookingRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api', dealerRoutes);
app.use('/api', departmentRoutes);
app.use('/api', leadRoutes);
app.use('/api', callbackRoutes);
app.use('/api', callRoutes);
app.use('/api', retellRoutes);
app.use('/api', serviceBookingRoutes);
app.use('/api', calendarRoutes);
app.use('/api', adminRoutes);

// Global error handler fallback (for uncaught errors in async handlers)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});