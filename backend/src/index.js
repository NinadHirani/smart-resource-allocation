require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const taskRoutes = require('./routes/tasks');
const volunteerRoutes = require('./routes/volunteers');
const matchingRoutes = require('./routes/matching');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'DATABASE_URL_MISSING') {
    return res.status(500).json({ error: 'Backend is missing DATABASE_URL configuration' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

module.exports = app;
