/** Single source of truth for plan limits, features, and display prices (GBP). */
const PLANS = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    limits: { audits: 3, keywords: 3, rankTrack: 0, competitors: 0, alerts: 0 },
    features: {
      keywordResearch: false,
      rankTracker: false,
      backlinks: false,
      aiVisibility: false,
      contentGap: false,
      localSeo: false,
      competitorAnalysis: false,
      changeAlerts: false,
      pdfExport: false,
      apiAccess: false,
      whiteLabel: false,
      team: false,
      webhooks: false,
    },
  },
  pro: {
    name: 'Pro',
    priceMonthly: 12,
    limits: { audits: 50, keywords: 100, rankTrack: 10, competitors: 1, alerts: 10 },
    features: {
      keywordResearch: true,
      rankTracker: true,
      backlinks: true,
      aiVisibility: true,
      contentGap: true,
      localSeo: true,
      competitorAnalysis: true,
      changeAlerts: true,
      pdfExport: true,
      apiAccess: false,
      whiteLabel: false,
      team: false,
      webhooks: false,
    },
  },
  max: {
    name: 'Max',
    priceMonthly: 29,
    limits: { audits: -1, keywords: -1, rankTrack: -1, competitors: 5, alerts: -1 },
    features: {
      keywordResearch: true,
      rankTracker: true,
      backlinks: true,
      aiVisibility: true,
      contentGap: true,
      localSeo: true,
      competitorAnalysis: true,
      changeAlerts: true,
      pdfExport: true,
      apiAccess: true,
      whiteLabel: true,
      team: true,
      webhooks: true,
    },
  },
};

function normalizePlan(plan) {
  return PLANS[plan] ? plan : 'free';
}

function getPlanConfig(plan) {
  return PLANS[normalizePlan(plan)];
}

function hasFeature(plan, feature) {
  return !!getPlanConfig(plan).features[feature];
}

function getLimit(plan, key) {
  return getPlanConfig(plan).limits[key];
}

function isWithinLimit(plan, key, used) {
  const limit = getLimit(plan, key);
  if (limit < 0) return true;
  return used < limit;
}

module.exports = { PLANS, normalizePlan, getPlanConfig, hasFeature, getLimit, isWithinLimit };
