require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');

const db = require('./db');
const { crawlWebsite } = require('./audit-engine');
const { getPlanConfig, hasFeature, isWithinLimit, normalizePlan, PLANS } = require('./plans');
const { mountMaxRoutes } = require('./max-routes');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./email');

const app = express();
const PORT = process.env.PORT || 4030;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// ── Security Headers (CSP + others) ──────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com https://www.clarity.ms; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://www.google-analytics.com https://www.facebook.com https://px.ads.linkedin.com; " +
    "frame-src 'self' https://www.facebook.com;"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'valuescan',
    runtime: 'backend/server.js',
    port: PORT,
    url: process.env.VALUESCAN_URL || 'https://valuescan.online',
  });
});

// ── Auth Middleware ────────────────────────────────────────────────
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
}

function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const user = await db.getUserById(req.user.id);
      const plan = normalizePlan(user?.plan);
      if (!hasFeature(plan, feature)) {
        return res.status(403).json({
          error: `This feature requires a ${feature === 'apiAccess' || feature === 'team' || feature === 'webhooks' || feature === 'whiteLabel' ? 'Max' : 'Pro'} plan`,
          upgrade: true,
        });
      }
      req.userPlan = plan;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

async function resolveUserPlan(userId) {
  if (!userId) return 'free';
  const user = await db.getUserById(userId);
  return normalizePlan(user?.plan);
}

// ── Auth Routes ──────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, plan = 'free' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  
  try {
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    
    const user = await db.createUser(email, password, name, plan);
    const token = jwt.sign({ id: user.id, email: user.email, role: 'user', plan: user.plan }, JWT_SECRET);
    
    // Send verification email
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await db.setEmailVerificationToken(email, verifyToken);
    await sendVerificationEmail(email, verifyToken, name);
    
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, plan: user.plan }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/refresh', authenticate, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, plan: user.plan },
      JWT_SECRET
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Audit Routes ─────────────────────────────────────────────────
async function handleAudit(req, res, targetUrl) {
  if (!targetUrl) return res.status(400).json({ error: 'URL required' });

  try {
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch {
        // anonymous
      }
    }

    if (userId) {
      const plan = await resolveUserPlan(userId);
      const today = new Date().toISOString().split('T')[0];
      const used = await db.getAuditCountToday(userId, today);
      const limit = getPlanConfig(plan).limits.audits;
      if (!isWithinLimit(plan, 'audits', used)) {
        return res.status(429).json({
          error: `Daily audit limit reached (${limit}/day on ${getPlanConfig(plan).name}). Upgrade for more.`,
          upgrade: true,
          plan,
          used,
          limit,
        });
      }
    }

    const report = await crawlWebsite(targetUrl);
    if (report.error) return res.status(500).json({ error: report.error });

    // Generate AI recommendations
    const { generateRecommendations } = require('./ai-recommendations');
    const recommendations = generateRecommendations(report);

    const saved = await db.saveAudit(userId, targetUrl, report.score, report.issues, report.warnings, report);

    if (userId) {
      const { dispatchWebhooks } = require('./max-routes');
      const sendHooks = dispatchWebhooks || (async () => {});
      void sendHooks(db, userId, 'audit.completed', {
        reportId: saved.id,
        url: targetUrl,
        score: report.score,
        issues: report.issues,
        warnings: report.warnings,
      });
    }

    res.json({
      score: report.score,
      issues: report.issues,
      warnings: report.warnings,
      url: targetUrl,
      reportId: String(saved.id),
      categories: report.categories,
      recommendations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET endpoint for audit (bypasses Cloudflare POST blocking)
app.get('/api/audit', (req, res) => handleAudit(req, res, req.query.url));

app.post('/api/audit', (req, res) => handleAudit(req, res, req.body?.url));

app.post('/api/audit/scan', (req, res) => handleAudit(req, res, req.body?.url));

app.get('/api/audit/history', authenticate, async (req, res) => {
  try {
    const history = await db.getAuditHistory(req.user.id, 30);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit/:id', async (req, res) => {
  try {
    const audit = await db.getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (audit.user_id && audit.user_id !== decoded.id && decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
        }
      } catch {
        // allow public read of saved anonymous reports
      }
    }

    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/audit/:id', authenticate, async (req, res) => {
  try {
    const audit = await db.getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    if (audit.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await db.deleteAudit(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk Audit ───────────────────────────────────────────────────
app.post('/api/audit/bulk', authenticate, async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'URLs array required' });
  if (urls.length > 10) return res.status(400).json({ error: 'Maximum 10 URLs at once' });
  
  try {
    const plan = await resolveUserPlan(req.user.id);
    const today = new Date().toISOString().split('T')[0];
    const used = await db.getAuditCountToday(req.user.id, today);
    const limit = getPlanConfig(plan).limits.audits;
    if (limit > 0 && used + urls.length > limit) {
      return res.status(429).json({ error: `Daily limit: ${limit} audits. You've used ${used}.` });
    }
    
    const results = [];
    for (const targetUrl of urls) {
      const report = await crawlWebsite(targetUrl);
      if (!report.error) {
        await db.saveAudit(req.user.id, targetUrl, report.score, report.issues, report.warnings, report);
      }
      results.push({ url: targetUrl, ...report });
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Compare Audits ───────────────────────────────────────────────
app.get('/api/audit/compare', authenticate, async (req, res) => {
  const { id1, id2 } = req.query;
  if (!id1 || !id2) return res.status(400).json({ error: 'Two audit IDs required' });
  try {
    const audit1 = await db.getAuditById(id1);
    const audit2 = await db.getAuditById(id2);
    if (!audit1 || !audit2) return res.status(404).json({ error: 'One or both audits not found' });
    
    const diff = {
      score: audit2.score - audit1.score,
      issues: audit2.issues - audit1.issues,
      warnings: audit2.warnings - audit1.warnings,
    };
    
    const categoryDiff = {};
    if (audit1.report?.categories && audit2.report?.categories) {
      Object.keys(audit1.report.categories).forEach(cat => {
        const c1 = audit1.report.categories[cat];
        const c2 = audit2.report.categories[cat];
        if (c1 && c2) {
          categoryDiff[cat] = {
            score1: Math.round((c1.score / c1.max) * 100),
            score2: Math.round((c2.score / c2.max) * 100),
            diff: Math.round((c2.score / c2.max) * 100) - Math.round((c1.score / c1.max) * 100),
          };
        }
      });
    }
    
    res.json({
      audit1: { id: audit1.id, url: audit1.url, score: audit1.score, issues: audit1.issues, warnings: audit1.warnings, created_at: audit1.created_at },
      audit2: { id: audit2.id, url: audit2.url, score: audit2.score, issues: audit2.issues, warnings: audit2.warnings, created_at: audit2.created_at },
      diff,
      categoryDiff,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CSV Export (Audit History) ───────────────────────────────────
app.get('/api/audit/history/export/csv', authenticate, async (req, res) => {
  try {
    const history = await db.getAuditHistory(req.user.id, 1000);
    if (!history.length) return res.status(404).json({ error: 'No audits to export' });

    const headers = ['Date', 'URL', 'Score', 'Issues', 'Warnings', 'SEO Score', 'SEM Score', 'Security Score', 'Performance Score'];
    const rows = history.map(a => [
      new Date(a.created_at).toISOString(),
      a.url,
      a.score,
      a.issues,
      a.warnings,
      a.report?.categories?.seo?.score || '',
      a.report?.categories?.sem?.score || '',
      a.report?.categories?.security?.score || '',
      a.report?.categories?.performance?.score || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="valuescan-audit-history.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audits', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const audits = await db.getRecentAudits(limit);
    res.json(audits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/contacts', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const contacts = await db.getAllContacts(limit);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/growth', authenticate, requireAdmin, async (req, res) => {
  try {
    const trend = await db.getSignupTrend(14);
    res.json(trend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:id/plan', authenticate, requireAdmin, async (req, res) => {
  const { plan } = req.body;
  if (!['free', 'pro', 'max'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    await db.updateUserPlan(req.params.id, plan);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await db.getSettingsMap();
    res.json({
      stripe_price_pro: settings.stripe_price_pro || '',
      stripe_price_max: settings.stripe_price_max || '',
      stripe_payment_link_pro: settings.stripe_payment_link_pro || '',
      stripe_payment_link_max: settings.stripe_payment_link_max || '',
      stripe_configured: !!stripe,
      stripe_webhook_url: `${process.env.VALUESCAN_URL || 'https://valuescan.online'}/api/stripe/webhook`,
      plan_prices: { pro: PLANS.pro.priceMonthly, max: PLANS.max.priceMonthly },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
  const allowed = ['stripe_price_pro', 'stripe_price_max', 'stripe_payment_link_pro', 'stripe_payment_link_max'];
  try {
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await db.setSetting(key, String(req.body[key]).trim());
      }
    }
    const settings = await db.getSettingsMap();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Support Ticket Routes ────────────────────────────────────────
app.post('/api/tickets', authenticate, async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });
    const result = await db.createTicket(req.user.id, subject, message, category || 'general', priority || 'normal');
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets', authenticate, async (req, res) => {
  try {
    const tickets = await db.getTickets(req.user.id);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets/:id', authenticate, async (req, res) => {
  try {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Ticket Routes ──────────────────────────────────────────
app.get('/api/admin/tickets', authenticate, requireAdmin, async (req, res) => {
  try {
    const tickets = await db.getAllTickets();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/tickets/:id/reply', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, reply } = req.body;
    await db.updateTicketStatus(req.params.id, status || 'resolved', reply || null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── History Cleanup Cron ─────────────────────────────────────────
async function cleanupHistory() {
  try {
    console.log('[CRON] Running history cleanup...');
    const users = await db.getAllUsers();
    for (const user of users) {
      const plan = user.plan || 'free';
      const daysToKeep = plan === 'free' ? 7 : plan === 'pro' ? 90 : -1;
      if (daysToKeep > 0) {
        const result = await db.cleanupOldAudits(user.id, daysToKeep);
        if (result.deleted > 0) {
          console.log(`[CRON] Cleaned up ${result.deleted} old audits for user ${user.id} (${plan})`);
        }
      }
    }
  } catch (err) {
    console.error('[CRON ERROR] cleanupHistory:', err.message);
  }
}

// ── Stripe Routes ────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const STRIPE_PRICES_ENV = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
  max: process.env.STRIPE_PRICE_MAX || 'price_max_monthly',
};

async function getStripeConfig() {
  const settings = await db.getSettingsMap();
  return {
    pricePro: settings.stripe_price_pro || STRIPE_PRICES_ENV.pro,
    priceMax: settings.stripe_price_max || STRIPE_PRICES_ENV.max,
    paymentLinkPro: settings.stripe_payment_link_pro || '',
    paymentLinkMax: settings.stripe_payment_link_max || '',
  };
}

// ── Contact Form ───────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: 'Email and message required' });
  try {
    await db.saveContact(name, email, subject, message);
    res.json({ success: true, message: 'Message received. We will get back to you soon.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Usage Quota ───────────────────────────────────────────────────
app.get('/api/quota', authenticate, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    const plan = normalizePlan(user?.plan);
    const today = new Date().toISOString().split('T')[0];
    const auditCount = await db.getAuditCountToday(req.user.id, today);
    const alertCount = await db.getUserAlertCount(req.user.id);
    const config = getPlanConfig(plan);
    res.json({
      plan,
      prices: { pro: PLANS.pro.priceMonthly, max: PLANS.max.priceMonthly },
      used: { audits: auditCount, alerts: alertCount },
      limits: config.limits,
      features: config.features,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Change Alerts ─────────────────────────────────────────────────
app.get('/api/alerts', authenticate, requireFeature('changeAlerts'), async (req, res) => {
  try {
    const alerts = await db.getUserAlerts(req.user.id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', authenticate, requireFeature('changeAlerts'), async (req, res) => {
  const { url, checkType } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const alertCount = await db.getUserAlertCount(req.user.id);
    if (!isWithinLimit(req.userPlan, 'alerts', alertCount)) {
      const limit = getPlanConfig(req.userPlan).limits.alerts;
      return res.status(429).json({
        error: `Alert limit reached (${limit} on ${getPlanConfig(req.userPlan).name}). Upgrade to Max for unlimited.`,
        upgrade: true,
      });
    }
    const alert = await db.createAlert(req.user.id, url, checkType || 'score_change');
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alerts/:id', authenticate, async (req, res) => {
  try {
    await db.deleteAlert(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Profile ───────────────────────────────────────────────────────
app.put('/api/profile', authenticate, async (req, res) => {
  const { name, company, timezone } = req.body;
  try {
    await db.updateUserProfile(req.user.id, { name, company, timezone });
    const user = await db.getUserById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const user = await db.getUserRow(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    await db.updatePassword(user.email, newPassword);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stripe/create-checkout', authenticate, async (req, res) => {
  const { plan } = req.body;
  if (!plan || !['pro', 'max'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    const stripeCfg = await getStripeConfig();
    const paymentLink = plan === 'pro' ? stripeCfg.paymentLinkPro : stripeCfg.paymentLinkMax;

    if (paymentLink) {
      const sep = paymentLink.includes('?') ? '&' : '?';
      return res.json({
        url: `${paymentLink}${sep}client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email)}`,
      });
    }

    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await db.updateStripeCustomer(user.id, customerId, null);
    }

    const priceId = plan === 'pro' ? stripeCfg.pricePro : stripeCfg.priceMax;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      metadata: { userId: String(user.id), plan },
      subscription_data: { metadata: { userId: String(user.id), plan } },
      success_url: `${req.headers.origin || 'https://valuescan.online'}/dashboard?plan=${plan}&success=true`,
      cancel_url: `${req.headers.origin || 'https://valuescan.online'}/pricing?canceled=true`,
    });
    
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = normalizePlan(session.metadata?.plan);
    if (userId && plan !== 'free') {
      await db.updateUserPlan(userId, plan);
      await db.updateStripeCustomer(userId, session.customer, session.subscription);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const user = await db.getUserByStripeCustomerId(subscription.customer);
    if (user) await db.updateUserPlan(user.id, 'free');
  }
  
  res.json({ received: true });
});

const { dispatchWebhooks } = mountMaxRoutes(app, {
  authenticate,
  requireFeature,
  db,
  crawlWebsite,
  isWithinLimit,
  getPlanConfig,
  normalizePlan,
  resolveUserPlan,
  hasFeature,
});
module.exports.dispatchWebhooks = dispatchWebhooks;

app.post('/api/stripe/create-portal', authenticate, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  try {
    const user = await db.getUserById(req.user.id);
    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${req.headers.origin || 'https://valuescan.online'}/profile`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google PageSpeed Insights API ───────────────────────────────
const { runPageSpeed } = require('./pagespeed');

app.get('/api/pagespeed', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'URL required' });
  const result = await runPageSpeed(targetUrl);
  if (result.success) res.json(result);
  else res.status(500).json(result);
});

// ── Email Verification (with real email) ──────────────────────
app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  try {
    const user = await db.verifyEmail(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/resend-verification', authenticate, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email_verified) return res.json({ success: true, message: 'Email already verified' });
    const token = crypto.randomBytes(32).toString('hex');
    await db.setEmailVerificationToken(user.email, token);
    await sendVerificationEmail(user.email, token, user.name);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = crypto.randomBytes(32).toString('hex');
    await db.createPasswordReset(email, token);
    await sendPasswordResetEmail(email, token, user.name);
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const reset = await db.getPasswordReset(token);
    if (!reset) return res.status(400).json({ error: 'Invalid or expired token' });
    await db.updatePassword(reset.email, password);
    await db.deletePasswordReset(token);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Contact Form ───────────────────────────────────────────────────
// ── Keyword Data (DataForSEO) ───────────────────────────────────
const { getKeywordsForDomain, getKeywordIdeas, getSERPResults } = require('./dataforseo');

app.get('/api/keywords/domain', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'Domain required' });
  const result = await getKeywordsForDomain(domain);
  res.json(result);
});

app.get('/api/keywords/ideas', async (req, res) => {
  const { seed } = req.query;
  if (!seed) return res.status(400).json({ error: 'Seed keyword required' });
  const result = await getKeywordIdeas(seed);
  res.json(result);
});

// ── SERP / Rank Tracking ────────────────────────────────────────
app.get('/api/serp', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: 'Keyword required' });
  const result = await getSERPResults(keyword);
  res.json(result);
});

// ── Report Export (PDF/CSV) ─────────────────────────────────────
const { generatePDF, generateCSV } = require('./report-export');
const fs = require('fs');

app.post('/api/audit/:id/export/pdf', async (req, res) => {
  try {
    const audit = await db.getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    const outputPath = path.join(__dirname, 'temp', `audit-${req.params.id}.pdf`);
    if (!fs.existsSync(path.join(__dirname, 'temp'))) fs.mkdirSync(path.join(__dirname, 'temp'));
    const result = await generatePDF(audit, outputPath);
    if (!result.success) return res.status(500).json(result);
    res.download(outputPath, `audit-${req.params.id}.pdf`, () => {
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit/:id/export/csv', async (req, res) => {
  try {
    const audit = await db.getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    const result = generateCSV(audit);
    if (!result.success) return res.status(500).json(result);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="audit-${req.params.id}.csv"`);
    res.send(result.csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Sitemap Generator ───────────────────────────────────────────
const { generateSitemap, validateSchema } = require('./sitemap-schema');

app.get('/api/sitemap', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const result = await generateSitemap(url);
  if (result.success) res.json(result);
  else res.status(500).json(result);
});

app.get('/api/sitemap/download', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const result = await generateSitemap(url);
  if (!result.success) return res.status(500).json(result);
  res.set('Content-Type', 'application/xml');
  res.set('Content-Disposition', 'attachment; filename="sitemap.xml"');
  res.send(result.xml);
});

// ── Schema Validator ──────────────────────────────────────────────
app.get('/api/schema', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const result = await validateSchema(url);
  if (result.success) res.json(result);
  else res.status(500).json(result);
});

// ── Usage Quota ───────────────────────────────────────────────────
app.get('/api/quota', authenticate, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    const today = new Date().toISOString().split('T')[0];
    const auditCount = await db.getAuditCountToday(req.user.id, today);
    const limits = {
      free: { audits: 5, keywords: 3, rankTrack: 0, competitors: 0 },
      pro: { audits: 50, keywords: 100, rankTrack: 10, competitors: 1 },
      max: { audits: -1, keywords: -1, rankTrack: -1, competitors: -1 }
    };
    const plan = user.plan || 'free';
    res.json({
      plan,
      used: { audits: auditCount },
      limits: limits[plan],
      features: {
        keywordResearch: plan !== 'free',
        rankTracker: plan !== 'free',
        backlinks: plan !== 'free',
        aiVisibility: plan !== 'free',
        contentGap: plan !== 'free',
        localSeo: plan !== 'free',
        competitorAnalysis: plan !== 'free',
        changeAlerts: plan !== 'free',
        apiAccess: plan === 'max',
        whiteLabel: plan === 'max',
        team: plan === 'max'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Change Alerts ─────────────────────────────────────────────────
app.get('/api/alerts', authenticate, async (req, res) => {
  try {
    const alerts = await db.getUserAlerts(req.user.id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', authenticate, async (req, res) => {
  const { url, checkType } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const alert = await db.createAlert(req.user.id, url, checkType || 'score_change');
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alerts/:id', authenticate, async (req, res) => {
  try {
    await db.deleteAlert(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Profile ───────────────────────────────────────────────────────
app.put('/api/profile', authenticate, async (req, res) => {
  const { name, company, timezone } = req.body;
  try {
    await db.updateUserProfile(req.user.id, { name, company, timezone });
    const user = await db.getUserById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const user = await db.getUserById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    await db.updatePassword(user.email, newPassword);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/account', authenticate, async (req, res) => {
  try {
    await db.deleteUser(req.user.id);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEO Tools Routes ───────────────────────────────────────────────
const { analyzeBacklinks, analyzeAIVisibility, analyzeContentGap, analyzeLocalSEO, analyzeCompetitor } = require('./seo-tools');

app.get('/api/backlinks', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const result = await analyzeBacklinks(url);
  res.json(result);
});

app.get('/api/ai-visibility', async (req, res) => {
  const { brand, domain } = req.query;
  if (!brand) return res.status(400).json({ error: 'Brand name required' });
  const result = await analyzeAIVisibility(brand, domain);
  res.json(result);
});

app.get('/api/content-gap', async (req, res) => {
  const { domain, competitor } = req.query;
  if (!domain || !competitor) return res.status(400).json({ error: 'Both domain and competitor required' });
  const result = await analyzeContentGap(domain, competitor);
  res.json(result);
});

app.get('/api/local-seo', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const result = await analyzeLocalSEO(url);
  res.json(result);
});

app.get('/api/competitors', async (req, res) => {
  const { domain, competitor } = req.query;
  if (!domain || !competitor) return res.status(400).json({ error: 'Both domain and competitor required' });
  const result = await analyzeCompetitor(domain, competitor);
  res.json(result);
});

// ── SEO Tool Export Routes ───────────────────────────────────────
const { exportBacklinksPDF, exportBacklinksCSV, exportAIVisibilityPDF, exportAIVisibilityCSV, exportContentGapPDF, exportContentGapCSV, exportLocalSEOPDF, exportLocalSEOCSV, exportCompetitorPDF, exportCompetitorCSV, exportKeywordsCSV, exportRankTrackerCSV } = require('./seo-tool-exports');

async function handleToolExport(req, res, type, dataFn, pdfFn, csvFn) {
  const format = req.query.format || 'pdf';
  try {
    const data = await dataFn();
    if (format === 'csv') {
      const result = csvFn(data);
      if (!result.success) return res.status(500).json(result);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', `attachment; filename="${type}.csv"`);
      return res.send(result.csv);
    }
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const outputPath = path.join(tempDir, `${type}-${Date.now()}.pdf`);
    const result = await pdfFn(data, outputPath);
    if (!result.success) return res.status(500).json(result);
    res.download(outputPath, `${type}.pdf`, () => {
      try { fs.unlinkSync(outputPath); } catch {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/api/backlinks/export', authenticate, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  handleToolExport(req, res, 'backlinks', () => analyzeBacklinks(url), exportBacklinksPDF, exportBacklinksCSV);
});

app.get('/api/ai-visibility/export', authenticate, async (req, res) => {
  const { brand, domain } = req.query;
  if (!brand) return res.status(400).json({ error: 'Brand required' });
  handleToolExport(req, res, 'ai-visibility', () => analyzeAIVisibility(brand, domain), exportAIVisibilityPDF, exportAIVisibilityCSV);
});

app.get('/api/content-gap/export', authenticate, async (req, res) => {
  const { domain, competitor } = req.query;
  if (!domain || !competitor) return res.status(400).json({ error: 'Both domains required' });
  handleToolExport(req, res, 'content-gap', () => analyzeContentGap(domain, competitor), exportContentGapPDF, exportContentGapCSV);
});

app.get('/api/local-seo/export', authenticate, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  handleToolExport(req, res, 'local-seo', () => analyzeLocalSEO(url), exportLocalSEOPDF, exportLocalSEOCSV);
});

app.get('/api/competitors/export', authenticate, async (req, res) => {
  const { domain, competitor } = req.query;
  if (!domain || !competitor) return res.status(400).json({ error: 'Both domains required' });
  handleToolExport(req, res, 'competitors', () => analyzeCompetitor(domain, competitor), exportCompetitorPDF, exportCompetitorCSV);
});

app.get('/api/keywords/export', authenticate, async (req, res) => {
  const { seed } = req.query;
  if (!seed) return res.status(400).json({ error: 'Seed required' });
  const { getKeywordIdeas } = require('./dataforseo');
  const data = await getKeywordIdeas(seed);
  const result = exportKeywordsCSV(data);
  if (!result.success) return res.status(500).json(result);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="keywords.csv"');
  res.send(result.csv);
});

app.get('/api/rank-tracker/export', authenticate, async (req, res) => {
  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: 'Keyword required' });
  const { getSERPResults } = require('./dataforseo');
  const data = await getSERPResults(keyword);
  const result = exportRankTrackerCSV(data);
  if (!result.success) return res.status(500).json(result);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="rank-tracker.csv"');
  res.send(result.csv);
});

// ── Serve Frontend ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const { startCronJobs } = require('./cron-jobs');

module.exports = { app, cleanupHistory };

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ValueScan API running on port ${PORT}`);
  console.log(`Database: ${process.env.DB_PATH || './valuescan.db'}`);
  console.log(`Stripe: ${stripe ? 'configured' : 'not configured'}`);
  startCronJobs();
});

module.exports = app;
