require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigration() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Migration completed');
  await pool.end();
}

runMigration().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await pool.end();
  process.exit(1);
});
