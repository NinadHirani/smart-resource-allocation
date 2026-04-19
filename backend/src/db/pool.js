const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({ connectionString, max: 2, idleTimeoutMillis: 30000 })
  : null;

function missingDatabaseError() {
  const error = new Error('DATABASE_URL is required');
  error.code = 'DATABASE_URL_MISSING';
  return error;
}

const proxyPool = {
  query(...args) {
    if (!pool) {
      throw missingDatabaseError();
    }
    return pool.query(...args);
  },
  connect(...args) {
    if (!pool) {
      throw missingDatabaseError();
    }
    return pool.connect(...args);
  },
  end(...args) {
    if (!pool) {
      return Promise.resolve();
    }
    return pool.end(...args);
  },
};

module.exports = proxyPool;
