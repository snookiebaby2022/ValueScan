import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface Crumb {
  label: string;
  to?: string;
}

const PATH_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  audits: 'Audit History',
  profile: 'Profile',
  contact: 'Contact',
  pricing: 'Pricing',
  blog: 'Blog',
  docs: 'API Docs',
  skills: 'Skills',
  admin: 'Admin',
  support: 'Support',
  onboarding: 'Onboarding',
  alerts: 'Change Alerts',
  'bulk-audit': 'Bulk Audit',
  compare: 'Compare Audits',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  'verify-email': 'Verify Email',
  'refund-policy': 'Refund Policy',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookie Policy',
  tools: 'Tools',
  keywords: 'Keyword Research',
  'rank-tracker': 'Rank Tracker',
  backlinks: 'Backlinks',
  'ai-visibility': 'AI Visibility',
  'content-gap': 'Content Gap',
  'local-seo': 'Local SEO',
  competitors: 'Competitors',
  max: 'Max',
  'api-keys': 'API Keys',
  team: 'Team',
  branding: 'Branding',
  webhooks: 'Webhooks',
  audit: 'Audit',
  scan: 'New Scan',
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;
  if (segments.length === 1 && segments[0] === 'login') return null;
  if (segments.length === 1 && segments[0] === 'signup') return null;

  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];

  let builtPath = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    builtPath += `/${seg}`;
    // Skip numeric/ID segments as labels, but keep the path
    if (/^\d+$/.test(seg) || seg.length > 30) {
      continue;
    }
    const label = PATH_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
    // Last segment has no link
    const isLast = i === segments.length - 1;
    crumbs.push({ label, to: isLast ? undefined : builtPath });
  }

  return (
    <nav aria-label="Breadcrumb" className="py-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        {crumbs.map((crumb, i) => (
          <li key={crumb.label + i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                {i === 0 && <Home className="w-3.5 h-3.5" />}
                <span>{crumb.label}</span>
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
