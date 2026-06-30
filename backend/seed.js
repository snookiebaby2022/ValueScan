const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'valuescan.db');
const db = new sqlite3.Database(DB_PATH);

const ADMIN_EMAIL = process.env.VALUESCAN_ADMIN_EMAIL || 'admin@valuescan.online';
const ADMIN_PASSWORD = process.env.VALUESCAN_ADMIN_PASSWORD || 'AdminPass123!';
const ADMIN_NAME = 'ValueScan Admin';

async function seed() {
  console.log('Seeding admin user...');
  
  const existing = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [ADMIN_EMAIL], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    console.log('Updating password and role to admin...');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET password_hash = ?, role = ?, name = ? WHERE email = ?', [hash, 'admin', ADMIN_NAME, ADMIN_EMAIL], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password_hash, name, plan, role) VALUES (?, ?, ?, ?, ?)',
        [ADMIN_EMAIL, hash, ADMIN_NAME, 'max', 'admin'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }
  
  console.log('');
  console.log('========================================');
  console.log('  ADMIN USER CREATED / UPDATED');
  console.log('========================================');
  console.log('  Email:    ' + ADMIN_EMAIL);
  console.log('  Password: (from VALUESCAN_ADMIN_PASSWORD env)');
  console.log('  Role:     admin');
  console.log('  Plan:     max');
  console.log('========================================');
  console.log('');
  console.log('Login at: https://valuescan.online/admin-login');
  console.log('');
  
  db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  db.close();
  process.exit(1);
});
