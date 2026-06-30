import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { getEffectivePlan, completeOnboardingStep } from '../lib/valuescan-service.js'
import { hasFeature } from '../lib/plan-features.js'
import {
  advanceLink,
  connectSite,
  generateArticle,
  getGrowthDashboard,
  getPublicArticle,
  publishNextArticle,
  seedLinkCampaign,
  seedMarketing,
  advanceMarketing,
  syncReddit,
  setAutopilot,
  setCmsWebhook,
} from '../lib/growth-service.js'

import { getPublicBacklinkProfile } from '../lib/growth-backlinks.js'

const router = Router()

router.get('/profiles/public/:slug', (req, res) => {
  const profile = getPublicBacklinkProfile(req.params.slug)
  if (!profile) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ profile })
})

router.get('/articles/public/:slug', (req, res) => {
  const article = getPublicArticle(req.params.slug)
  if (!article) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ article })
})

router.use(authRequired)

function requireGrowthRoadmap(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'growth_roadmap')) {
    res.status(403).json({ error: 'Upgrade to Pro for growth roadmap, site connection, and blockers' })
    return
  }
  next()
}

router.get('/dashboard', requireGrowthRoadmap, (req, res) => {
  const dashboard = getGrowthDashboard(req.user!.userId)
  const plan = getEffectivePlan(req.user!.userId)
  res.json({
    ...dashboard,
    access: {
      plan: plan.slug,
      growthRoadmap: true,
      aiContent: hasFeature(plan.slug, 'ai_content'),
      keywords: hasFeature(plan.slug, 'keywords'),
      llmVisibility: hasFeature(plan.slug, 'llm_visibility'),
      linkBuilding: hasFeature(plan.slug, 'link_building'),
      marketingCampaigns: hasFeature(plan.slug, 'marketing_campaigns'),
      reddit: hasFeature(plan.slug, 'reddit'),
      autopilot: hasFeature(plan.slug, 'autopilot'),
      monitors: hasFeature(plan.slug, 'monitors'),
      emailAlerts: hasFeature(plan.slug, 'email_alerts'),
    },
  })
})

router.post('/site', requireGrowthRoadmap, (req, res) => {
  const { url, label } = req.body as { url?: string; label?: string }
  if (!url?.trim()) {
    res.status(400).json({ error: 'Site URL is required' })
    return
  }
  const site = connectSite(req.user!.userId, url, label, req.userRow!.email)
  completeOnboardingStep(req.user!.userId, 'connect_site')
  res.json({ site, dashboard: getGrowthDashboard(req.user!.userId) })
})

router.patch('/site/cms', requireGrowthRoadmap, (req, res) => {
  const { webhookUrl } = req.body as { webhookUrl?: string | null }
  setCmsWebhook(req.user!.userId, webhookUrl ?? null)
  res.json({ ok: true })
})

router.post('/content/generate', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'ai_content')) {
    res.status(403).json({ error: 'Upgrade to Pro for AI content generation' })
    return
  }
  const { keyword } = req.body as { keyword?: string }
  const article = await generateArticle(req.user!.userId, req.userRow!.email, keyword)
  if (!article) {
    res.status(400).json({ error: 'Connect a site first' })
    return
  }
  res.json({ article })
})

router.post('/content/publish', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'ai_content')) {
    res.status(403).json({ error: 'Upgrade to Pro for AI content generation' })
    return
  }
  const article = await publishNextArticle(req.user!.userId, req.userRow!.email)
  if (!article) {
    res.status(404).json({ error: 'No scheduled articles ready to publish' })
    return
  }
  res.json({ article })
})

router.post('/links/start', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'link_building')) {
    res.status(403).json({ error: 'Upgrade to Agency for automated link building' })
    return
  }
  const links = await seedLinkCampaign(req.user!.userId, req.userRow!.email, req.userRow!.name)
  res.json({ links })
})

router.post('/links/advance', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'link_building')) {
    res.status(403).json({ error: 'Upgrade to Agency for automated link building' })
    return
  }
  const link = await advanceLink(req.user!.userId, req.userRow!.email, req.userRow!.name)
  if (!link) {
    res.status(404).json({ error: 'No active outreach to advance' })
    return
  }
  res.json({ link })
})

router.post('/marketing/start', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'marketing_campaigns')) {
    res.status(403).json({ error: 'Upgrade to Agency for marketing campaigns on autopilot' })
    return
  }
  const campaigns = await seedMarketing(req.user!.userId, req.userRow!.email)
  res.json({ campaigns })
})

router.post('/marketing/advance', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'marketing_campaigns')) {
    res.status(403).json({ error: 'Upgrade to Agency for marketing campaigns on autopilot' })
    return
  }
  const campaign = await advanceMarketing(req.user!.userId, req.userRow!.email, req.userRow!.name)
  if (!campaign) {
    res.status(404).json({ error: 'No campaigns to advance' })
    return
  }
  res.json({ campaign })
})

router.post('/reddit/sync', async (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'reddit')) {
    res.status(403).json({ error: 'Upgrade to Agency for Reddit discovery' })
    return
  }
  const threads = await syncReddit(req.user!.userId)
  if (!threads.length) {
    res.status(400).json({ error: 'Connect a site first' })
    return
  }
  res.json({ threads })
})

router.patch('/autopilot', (req, res) => {
  const plan = getEffectivePlan(req.user!.userId)
  if (!hasFeature(plan.slug, 'autopilot')) {
    res.status(403).json({ error: 'Upgrade to Agency for autopilot growth' })
    return
  }
  const { enabled } = req.body as { enabled?: boolean }
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' })
    return
  }
  setAutopilot(req.user!.userId, enabled)
  res.json({ autopilotEnabled: enabled, dashboard: getGrowthDashboard(req.user!.userId) })
})

export default router
