const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey() {
  const raw = `vs_live_${crypto.randomBytes(24).toString('hex')}`;
  return { raw, prefix: raw.slice(0, 16), hash: hashApiKey(raw) };
}

function generateToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function dispatchWebhooks(db, userId, event, payload) {
  const hooks = await db.listWebhooks(userId);
  const matching = hooks.filter((h) => h.active && (h.events === '*' || h.events.split(',').map((e) => e.trim()).includes(event)));
  await Promise.all(
    matching.map(async (hook) => {
      try {
        const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        const full = await db.getWebhookWithSecret(hook.id);
        const sig = crypto.createHmac('sha256', full.secret).update(body).digest('hex');
        await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ValueScan-Signature': sig,
            'X-ValueScan-Event': event,
          },
          body,
        });
        await db.logWebhookDelivery(hook.id, event, true, null);
      } catch (err) {
        await db.logWebhookDelivery(hook.id, event, false, err.message);
      }
    })
  );
}

function mountMaxRoutes(app, deps) {
  const { authenticate, requireFeature, db, crawlWebsite, isWithinLimit, getPlanConfig, normalizePlan, resolveUserPlan } = deps;

  async function apiKeyAuth(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'X-API-Key header required' });
    try {
      const row = await db.getApiKeyByHash(hashApiKey(key));
      if (!row) return res.status(401).json({ error: 'Invalid API key' });
      const user = await db.getUserById(row.user_id);
      const plan = normalizePlan(user?.plan);
      if (!deps.hasFeature(plan, 'apiAccess')) {
        return res.status(403).json({ error: 'API access requires Max plan' });
      }
      req.apiUserId = row.user_id;
      req.apiKeyId = row.id;
      await db.touchApiKey(row.id);
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── API Keys ───────────────────────────────────────────────────
  app.get('/api/max/api-keys', authenticate, requireFeature('apiAccess'), async (req, res) => {
    try {
      const keys = await db.listApiKeys(req.user.id);
      res.json({ keys });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/max/api-keys', authenticate, requireFeature('apiAccess'), async (req, res) => {
    const name = (req.body?.name || 'Default').trim().slice(0, 64);
    try {
      const existing = await db.listApiKeys(req.user.id);
      if (existing.length >= 10) return res.status(429).json({ error: 'Maximum 10 API keys per account' });
      const { raw, prefix, hash } = generateApiKey();
      const row = await db.createApiKey(req.user.id, name, prefix, hash);
      res.json({ key: { id: row.id, name, prefix, key: raw, created_at: row.created_at } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/max/api-keys/:id', authenticate, requireFeature('apiAccess'), async (req, res) => {
    try {
      await db.revokeApiKey(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Branding (white-label) ─────────────────────────────────────
  app.get('/api/max/branding', authenticate, requireFeature('whiteLabel'), async (req, res) => {
    try {
      const branding = await db.getBranding(req.user.id);
      res.json({ branding });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/max/branding', authenticate, requireFeature('whiteLabel'), async (req, res) => {
    try {
      const branding = await db.saveBranding(req.user.id, {
        companyName: req.body.companyName,
        logoUrl: req.body.logoUrl,
        accentColor: req.body.accentColor,
        hideValueScan: !!req.body.hideValueScan,
        reportFooter: req.body.reportFooter,
      });
      res.json({ branding });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Team ───────────────────────────────────────────────────────
  app.get('/api/max/team', authenticate, requireFeature('team'), async (req, res) => {
    try {
      const members = await db.listTeamMembers(req.user.id);
      res.json({ members });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/max/team/invite', authenticate, requireFeature('team'), async (req, res) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email required' });
    try {
      const members = await db.listTeamMembers(req.user.id);
      if (members.length >= 20) return res.status(429).json({ error: 'Maximum 20 team members' });
      const token = generateToken();
      const invite = await db.createTeamInvite(req.user.id, email, token);
      const acceptUrl = `/team/accept/${token}`;
      const inviter = await db.getUserById(req.user.id);
      const { sendTeamInviteEmail } = require('../email');
      await sendTeamInviteEmail(email, acceptUrl, inviter?.name || inviter?.email);
      res.json({
        invite: {
          id: invite.id,
          email,
          status: 'pending',
          acceptUrl,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/max/team/accept/:token', authenticate, async (req, res) => {
    try {
      await db.acceptTeamInvite(req.params.token, req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/max/team/:memberId', authenticate, requireFeature('team'), async (req, res) => {
    try {
      await db.removeTeamMember(req.user.id, req.params.memberId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Webhooks ───────────────────────────────────────────────────
  app.get('/api/max/webhooks', authenticate, requireFeature('webhooks'), async (req, res) => {
    try {
      const webhooks = await db.listWebhooks(req.user.id);
      const deliveries = await db.getRecentWebhookDeliveries(req.user.id, 20);
      res.json({ webhooks, deliveries });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/max/webhooks', authenticate, requireFeature('webhooks'), async (req, res) => {
    const url = (req.body?.url || '').trim();
    const events = (req.body?.events || 'audit.completed').trim();
    if (!url) return res.status(400).json({ error: 'URL required' });
    try {
      const secret = `whsec_${generateToken(16)}`;
      const hook = await db.createWebhook(req.user.id, url, events, secret);
      res.json({ webhook: { ...hook, secret } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/max/webhooks/:id', authenticate, requireFeature('webhooks'), async (req, res) => {
    try {
      await db.deleteWebhook(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/max/webhooks/:id/test', authenticate, requireFeature('webhooks'), async (req, res) => {
    try {
      const hooks = await db.listWebhooks(req.user.id);
      if (!hooks.find((h) => String(h.id) === String(req.params.id))) {
        return res.status(404).json({ error: 'Webhook not found' });
      }
      const hook = await db.getWebhookWithSecret(req.params.id);
      if (!hook) return res.status(404).json({ error: 'Webhook not found' });
      const body = JSON.stringify({ event: 'test.ping', payload: { message: 'ValueScan webhook test' }, timestamp: new Date().toISOString() });
      const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ValueScan-Signature': sig, 'X-ValueScan-Event': 'test.ping' },
        body,
      });
      await db.logWebhookDelivery(hook.id, 'test.ping', true, null);
      res.json({ success: true });
    } catch (err) {
      await db.logWebhookDelivery(req.params.id, 'test.ping', false, err.message).catch(() => {});
      res.status(500).json({ error: err.message });
    }
  });

  // ── Public API v1 ──────────────────────────────────────────────
  app.get('/api/v1/audit', apiKeyAuth, async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'url query parameter required' });
    try {
      const plan = await resolveUserPlan(req.apiUserId);
      const today = new Date().toISOString().split('T')[0];
      const used = await db.getAuditCountToday(req.apiUserId, today);
      if (!isWithinLimit(plan, 'audits', used)) {
        return res.status(429).json({ error: 'Daily audit limit reached' });
      }
      const report = await crawlWebsite(url);
      if (report.error) return res.status(500).json({ error: report.error });
      const saved = await db.saveAudit(req.apiUserId, url, report.score, report.issues, report.warnings, report);
      void dispatchWebhooks(db, req.apiUserId, 'audit.completed', {
        reportId: saved.id,
        url,
        score: report.score,
        issues: report.issues,
        warnings: report.warnings,
      });
      res.json({
        reportId: saved.id,
        url,
        score: report.score,
        issues: report.issues,
        warnings: report.warnings,
        categories: report.categories,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/audit/:id', apiKeyAuth, async (req, res) => {
    try {
      const audit = await db.getAuditById(req.params.id);
      if (!audit) return res.status(404).json({ error: 'Not found' });
      if (audit.user_id && audit.user_id !== req.apiUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json({
        id: audit.id,
        url: audit.url,
        score: audit.score,
        issues: audit.issues,
        warnings: audit.warnings,
        report: audit.report,
        created_at: audit.created_at,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return { dispatchWebhooks };
}

module.exports = { mountMaxRoutes, dispatchWebhooks };
