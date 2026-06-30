export type ToolItem = {
  label: string;
  to: string;
  description: string;
  badge?: string;
};

export type ToolCategory = {
  label: string;
  tools: ToolItem[];
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    label: 'SEO Research',
    tools: [
      { label: 'Keyword Research', to: '/tools/keywords', description: 'Volume, difficulty, CPC & intent', badge: 'Popular' },
      { label: 'Content Gap', to: '/tools/content-gap', description: 'Topics competitors rank for that you miss' },
      { label: 'SERP Preview', to: '/tools/serp-preview', description: 'Preview how your page looks in Google' },
      { label: 'Meta Analyzer', to: '/tools/meta-analyzer', description: 'Title, description & OG tag checker' },
      { label: 'Schema Generator', to: '/tools/schema-generator', description: 'Build JSON-LD structured data' },
    ],
  },
  {
    label: 'Rank & Track',
    tools: [
      { label: 'Rank Tracker', to: '/tools/rank-tracker', description: 'Daily keyword position monitoring' },
      { label: 'AI Visibility', to: '/tools/ai-visibility', description: 'How AI search engines see your brand' },
      { label: 'Change Alerts', to: '/alerts', description: 'Get notified when scores drop' },
    ],
  },
  {
    label: 'Technical SEO',
    tools: [
      { label: 'Site Speed', to: '/tools/site-speed', description: 'Core Web Vitals & load time analysis' },
      { label: 'Broken Links', to: '/tools/broken-links', description: 'Find 404s and redirect chains' },
      { label: 'Sitemap Checker', to: '/tools/sitemap-checker', description: 'Validate XML sitemap coverage' },
      { label: 'Robots.txt', to: '/tools/robots-txt', description: 'Test crawl rules & disallow paths' },
      { label: 'Redirect Checker', to: '/tools/redirect-checker', description: 'Trace 301/302 redirect hops' },
    ],
  },
  {
    label: 'Links & Authority',
    tools: [
      { label: 'Backlink Analyzer', to: '/tools/backlinks', description: 'Domain authority & link profile' },
      { label: 'Competitor Analysis', to: '/tools/competitors', description: 'Side-by-side domain comparison' },
    ],
  },
  {
    label: 'Local & GEO',
    tools: [
      { label: 'Local SEO', to: '/tools/local-seo', description: 'NAP, GBP & local pack readiness' },
      { label: 'GEO Optimizer', to: '/tools/geo-optimizer', description: 'Optimise for AI answer engines' },
    ],
  },
  {
    label: 'Audits',
    tools: [
      { label: 'Full Site Audit', to: '/', description: '50+ checks across SEO, SEM & security', badge: 'Popular' },
      { label: 'Audit History', to: '/audits', description: 'View all past audit reports' },
      { label: 'Max Features', to: '/max', description: 'API keys, team, webhooks & white-label', badge: 'Max' },
    ],
  },
];

export const ALL_TOOLS = TOOL_CATEGORIES.flatMap((c) => c.tools);

export function getToolByPath(path: string): ToolItem | undefined {
  return ALL_TOOLS.find((t) => t.to === path || t.to === `/tools/${path}`);
}
