require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'valuescan.db');
const db = new sqlite3.Database(DB_PATH);

// Initialize schema
// Update user schema to include email_verified and verification_token
// We check if columns exist first
function ensureColumns() {
  db.get("PRAGMA table_info(users)", (err, rows) => {
    if (err) return;
    const hasEmailVerified = false; // We'll just run ALTER TABLE safely
    const hasCompany = false;
    const hasTimezone = false;
    
    db.run('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0', () => {});
    db.run('ALTER TABLE users ADD COLUMN verification_token TEXT', () => {});
    db.run('ALTER TABLE users ADD COLUMN company TEXT', () => {});
    db.run('ALTER TABLE users ADD COLUMN timezone TEXT', () => {});
  });
}

ensureColumns();

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      plan TEXT DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      role TEXT DEFAULT 'user',
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      company TEXT,
      timezone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      url TEXT NOT NULL,
      score INTEGER,
      issues INTEGER,
      warnings INTEGER,
      report_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rank_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      domain TEXT NOT NULL,
      keyword TEXT NOT NULL,
      position INTEGER,
      previous INTEGER,
      volume INTEGER,
      difficulty INTEGER,
      history TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS change_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      url TEXT NOT NULL,
      check_type TEXT DEFAULT 'score_change',
      last_score INTEGER,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alert_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_id) REFERENCES change_alerts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      events TEXT DEFAULT 'audit.completed',
      secret TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL,
      event TEXT,
      success INTEGER DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL,
      member_user_id INTEGER,
      member_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      invite_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_user_id) REFERENCES users(id),
      FOREIGN KEY (member_user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS branding (
      user_id INTEGER PRIMARY KEY,
      company_name TEXT,
      logo_url TEXT,
      accent_color TEXT DEFAULT '#7c3aed',
      hide_valuescan INTEGER DEFAULT 0,
      report_footer TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      admin_reply TEXT,
      replied_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, email, name, plan, role, company, timezone, email_verified, stripe_customer_id, stripe_subscription_id, created_at FROM users WHERE id = ?',
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function getUserRow(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUser(email, password, name, plan = 'free') {
  return new Promise(async (resolve, reject) => {
    const hash = await bcrypt.hash(password, 10);
    const token = require('crypto').randomBytes(32).toString('hex');
    db.run(
      'INSERT INTO users (email, password_hash, name, plan, verification_token) VALUES (?, ?, ?, ?, ?)',
      [email, hash, name, plan, token],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, email, name, plan, verification_token: token });
      }
    );
  });
}

function updateUserPlan(userId, plan) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET plan = ? WHERE id = ?', [plan, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function updateStripeCustomer(userId, customerId, subscriptionId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?',
      [customerId, subscriptionId || null, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getUserByStripeCustomerId(customerId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE stripe_customer_id = ?', [customerId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getUserAlertCount(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM change_alerts WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
}

function updateUserProfile(userId, { name, company, timezone }) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (company !== undefined) { fields.push('company = ?'); values.push(company); }
    if (timezone !== undefined) { fields.push('timezone = ?'); values.push(timezone); }
    if (fields.length === 0) return resolve();
    values.push(userId);
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function verifyEmail(token) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE verification_token = ?', [token], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      db.run('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?', [row.id], (err2) => {
        if (err2) reject(err2);
        else resolve({ id: row.id, email: row.email });
      });
    });
  });
}

function setEmailVerificationToken(email, token) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET verification_token = ? WHERE email = ?', [token, email], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function saveAudit(userId, url, score, issues, warnings, report) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO audits (user_id, url, score, issues, warnings, report_json) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, url, score, issues, warnings, JSON.stringify(report)],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function getAuditHistory(userId, limit = 30) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, url, score, issues, warnings, created_at FROM audits WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getAuditById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM audits WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row ? { ...row, report: JSON.parse(row.report_json) } : null);
    });
  });
}

function deleteAudit(id, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM audits WHERE id = ? AND user_id = ?', [id, userId], function (err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
}

function getAuditCountToday(userId, date) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM audits WHERE user_id = ? AND date(created_at) = ?', [userId, date], (err, row) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
}

function createPasswordReset(email, token) {
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM password_resets WHERE email = ?', [email], () => {
      db.run(
        'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
        [email, token, expires],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

function getPasswordReset(token) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime("now")', [token], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function deletePasswordReset(token) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM password_resets WHERE token = ?', [token], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function updatePassword(email, password) {
  return new Promise(async (resolve, reject) => {
    const hash = await bcrypt.hash(password, 10);
    db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function saveContact(name, email, subject, message) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)', [name, email, subject, message], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.name, u.email, u.plan, u.role, u.email_verified, u.created_at,
              COUNT(a.id) as scans
       FROM users u
       LEFT JOIN audits a ON a.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getStats() {
  return new Promise((resolve, reject) => {
    const queries = [
      ['totalUsers', 'SELECT COUNT(*) as v FROM users'],
      ['totalAudits', 'SELECT COUNT(*) as v FROM audits WHERE date(created_at) = date("now")'],
      ['totalAuditsAll', 'SELECT COUNT(*) as v FROM audits'],
      ['auditsThisWeek', 'SELECT COUNT(*) as v FROM audits WHERE created_at >= datetime("now", "-7 days")'],
      ['proUsers', 'SELECT COUNT(*) as v FROM users WHERE plan = "pro"'],
      ['maxUsers', 'SELECT COUNT(*) as v FROM users WHERE plan = "max"'],
      ['freeUsers', 'SELECT COUNT(*) as v FROM users WHERE plan = "free" OR plan IS NULL'],
      ['totalContacts', 'SELECT COUNT(*) as v FROM contacts'],
      ['contactsThisWeek', 'SELECT COUNT(*) as v FROM contacts WHERE created_at >= datetime("now", "-7 days")'],
      ['avgAuditScore', 'SELECT ROUND(AVG(score), 1) as v FROM audits'],
      ['verifiedUsers', 'SELECT COUNT(*) as v FROM users WHERE email_verified = 1'],
    ];
    const result = {};
    let pending = queries.length;
    queries.forEach(([key, sql]) => {
      db.get(sql, (err, row) => {
        if (err) return reject(err);
        result[key] = row?.v ?? 0;
        pending -= 1;
        if (pending === 0) resolve(result);
      });
    });
  });
}

function getRecentAudits(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT a.id, a.url, a.score, a.issues, a.warnings, a.created_at, a.user_id,
              u.email as user_email, u.name as user_name
       FROM audits a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getAllContacts(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM contacts ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getSignupTrend(days = 14) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT date(created_at) as day, COUNT(*) as count
       FROM users
       WHERE created_at >= datetime("now", ?)
       GROUP BY date(created_at)
       ORDER BY day ASC`,
      [`-${days} days`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Change alerts
function createAlert(userId, url, checkType) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO change_alerts (user_id, url, check_type) VALUES (?, ?, ?)', [userId, url, checkType], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, userId, url, checkType, active: 1 });
    });
  });
}

function getUserAlerts(userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM change_alerts WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function deleteAlert(id, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM change_alerts WHERE id = ? AND user_id = ?', [id, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// App settings (Stripe config, etc.)
function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM app_settings WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row?.value ?? null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime("now")',
      [key, value],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value, updated_at FROM app_settings ORDER BY key', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getSettingsMap() {
  return getAllSettings().then((rows) => {
    const map = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    return map;
  });
}

// API keys
function listApiKeys(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, key_prefix, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function createApiKey(userId, name, prefix, hash) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO api_keys (user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?)',
      [userId, name, prefix, hash],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, created_at: new Date().toISOString() });
      }
    );
  });
}

function getApiKeyByHash(hash) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM api_keys WHERE key_hash = ?', [hash], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function touchApiKey(id) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function revokeApiKey(userId, id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM api_keys WHERE id = ? AND user_id = ?', [id, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Branding
function getBranding(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM branding WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row || {
        user_id: userId,
        company_name: '',
        logo_url: '',
        accent_color: '#7c3aed',
        hide_valuescan: 0,
        report_footer: '',
      });
    });
  });
}

function saveBranding(userId, data) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO branding (user_id, company_name, logo_url, accent_color, hide_valuescan, report_footer, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime("now"))
       ON CONFLICT(user_id) DO UPDATE SET
         company_name = excluded.company_name,
         logo_url = excluded.logo_url,
         accent_color = excluded.accent_color,
         hide_valuescan = excluded.hide_valuescan,
         report_footer = excluded.report_footer,
         updated_at = datetime("now")`,
      [
        userId,
        data.companyName || '',
        data.logoUrl || '',
        data.accentColor || '#7c3aed',
        data.hideValueScan ? 1 : 0,
        data.reportFooter || '',
      ],
      async (err) => {
        if (err) reject(err);
        else resolve(await getBranding(userId));
      }
    );
  });
}

// Team
function listTeamMembers(ownerId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT tm.id, tm.member_email, tm.member_user_id, tm.status, tm.created_at,
              u.name as member_name, u.email as member_account_email
       FROM team_members tm
       LEFT JOIN users u ON u.id = tm.member_user_id
       WHERE tm.owner_user_id = ?
       ORDER BY tm.created_at DESC`,
      [ownerId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function createTeamInvite(ownerId, email, token) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM team_members WHERE owner_user_id = ? AND member_email = ? AND status != "removed"',
      [ownerId, email],
      (err, existing) => {
        if (err) return reject(err);
        if (existing) return reject(new Error('This email is already invited or on your team'));
        db.run(
          'INSERT INTO team_members (owner_user_id, member_email, status, invite_token) VALUES (?, ?, "pending", ?)',
          [ownerId, email, token],
          function(insertErr) {
            if (insertErr) reject(insertErr);
            else resolve({ id: this.lastID });
          }
        );
      }
    );
  });
}

function acceptTeamInvite(token, memberUserId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM team_members WHERE invite_token = ? AND status = "pending"', [token], (err, invite) => {
      if (err) return reject(err);
      if (!invite) return reject(new Error('Invalid or expired invitation'));
      db.run(
        'UPDATE team_members SET member_user_id = ?, status = "active", invite_token = NULL WHERE id = ?',
        [memberUserId, invite.id],
        (updateErr) => {
          if (updateErr) reject(updateErr);
          else resolve();
        }
      );
    });
  });
}

function removeTeamMember(ownerId, memberId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE team_members SET status = "removed" WHERE id = ? AND owner_user_id = ?',
      [memberId, ownerId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Webhooks
function listWebhooks(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, url, events, active, created_at FROM webhooks WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function getWebhookWithSecret(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, url, secret, events, active FROM webhooks WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createWebhook(userId, url, events, secret) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO webhooks (user_id, url, events, secret) VALUES (?, ?, ?, ?)',
      [userId, url, events, secret],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, url, events, active: 1, created_at: new Date().toISOString() });
      }
    );
  });
}

function deleteWebhook(userId, id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM webhooks WHERE id = ? AND user_id = ?', [id, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function logWebhookDelivery(webhookId, event, success, error) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO webhook_deliveries (webhook_id, event, success, error) VALUES (?, ?, ?, ?)',
      [webhookId, event, success ? 1 : 0, error || null],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getRecentWebhookDeliveries(userId, limit = 20) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT d.id, d.event, d.success, d.error, d.created_at, w.url
       FROM webhook_deliveries d
       JOIN webhooks w ON w.id = d.webhook_id
       WHERE w.user_id = ?
       ORDER BY d.created_at DESC LIMIT ?`,
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function getAllActiveAlerts() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM change_alerts WHERE active = 1', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function updateAlertScore(id, score) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE change_alerts SET last_score = ? WHERE id = ?', [score, id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getDistinctUrls() {
  return new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT user_id, url FROM audits ORDER BY created_at DESC LIMIT 100', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}


// ── Audit History Cleanup ─────────────────────────────────────────
function cleanupOldAudits(userId, daysToKeep) {
  return new Promise((resolve, reject) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    db.run(
      'DELETE FROM audits WHERE user_id = ? AND created_at < ?',
      [userId, cutoff.toISOString()],
      function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes });
      }
    );
  });
}

// ── Support Tickets ───────────────────────────────────────────────
function createTicket(userId, subject, message, category = 'general', priority = 'normal') {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO support_tickets (user_id, subject, message, category, priority) VALUES (?, ?, ?, ?, ?)',
      [userId, subject, message, category, priority],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function getTickets(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getAllTickets() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT t.*, u.email, u.name
       FROM support_tickets t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getTicketById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT t.*, u.email, u.name
       FROM support_tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function updateTicketStatus(id, status, adminReply = null) {
  return new Promise((resolve, reject) => {
    const repliedAt = adminReply ? new Date().toISOString() : null;
    db.run(
      'UPDATE support_tickets SET status = ?, admin_reply = ?, replied_at = ? WHERE id = ?',
      [status, adminReply, repliedAt, id],
      function(err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      }
    );
  });
}

function deleteUser(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
}

module.exports = {
  db,
  getUserByEmail,
  getUserById,
  getUserRow,
  createUser,
  updateUserPlan,
  updateStripeCustomer,
  getUserByStripeCustomerId,
  getUserAlertCount,
  updateUserProfile,
  verifyEmail,
  setEmailVerificationToken,
  saveAudit,
  getAuditHistory,
  getAuditById,
  deleteAudit,
  getAuditCountToday,
  createPasswordReset,
  getPasswordReset,
  deletePasswordReset,
  updatePassword,
  saveContact,
  getAllUsers,
  getStats,
  getRecentAudits,
  getAllContacts,
  getSignupTrend,
  createAlert,
  getUserAlerts,
  deleteAlert,
  getAllActiveAlerts,
  updateAlertScore,
  getDistinctUrls,
  getSetting,
  setSetting,
  getAllSettings,
  getSettingsMap,
  listApiKeys,
  createApiKey,
  getApiKeyByHash,
  touchApiKey,
  revokeApiKey,
  getBranding,
  saveBranding,
  listTeamMembers,
  createTeamInvite,
  acceptTeamInvite,
  removeTeamMember,
  listWebhooks,
  createWebhook,
  deleteWebhook,
  getWebhookWithSecret,
  logWebhookDelivery,
  getRecentWebhookDeliveries,
  // Support tickets
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  getAllTickets,
  deleteUser,
};
