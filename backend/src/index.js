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

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_FIREBASE,
  'https://smart-resource-allocation-seven.vercel.app',
  'https://smart-resource-ninad-2026.web.app',
  'http://localhost:5173',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
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
  if (err.code === '53300') {
    return res.status(503).json({ error: 'Database connection limit reached. Try again shortly.' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

module.exports = app;
