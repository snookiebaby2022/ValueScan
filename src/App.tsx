import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import PlanGate from './components/layout/PlanGate';
import Navbar from './components/layout/Navbar';
import ErrorBoundary from './components/layout/ErrorBoundary';
import CookieConsent from './components/layout/CookieConsent';
import { ToastProvider } from './components/layout/ToastProvider';
import type { PlanFeature } from './lib/plans';
import LandingPage from './components/pages/LandingPage';
import Login from './components/pages/Login';
import AdminLogin from './components/pages/AdminLogin';
import Signup from './components/pages/Signup';
import PricingPage from './components/pages/PricingPage';
import ForgotPassword from './components/pages/ForgotPassword';
import ResetPassword from './components/pages/ResetPassword';
import VerifyEmail from './components/pages/VerifyEmail';
import Contact from './components/pages/Contact';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import Terms from './components/pages/Terms';
import CookiePolicy from './components/pages/CookiePolicy';
import RefundPolicy from './components/pages/RefundPolicy';
import NotFound from './components/pages/NotFound';
import TeamAcceptPage from './components/pages/max/TeamAcceptPage';
import AuditScan from './components/pages/AuditScan';

const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const AdminPanel = lazy(() => import('./components/pages/AdminPanel'));
const ApiDocs = lazy(() => import('./components/pages/ApiDocs'));
const SkillsPage = lazy(() => import('./components/pages/SkillsPage'));
const RankTracker = lazy(() => import('./components/pages/RankTracker'));
const Backlinks = lazy(() => import('./components/pages/Backlinks'));
const AiVisibility = lazy(() => import('./components/pages/AiVisibility'));
const ContentGap = lazy(() => import('./components/pages/ContentGap'));
const LocalSeo = lazy(() => import('./components/pages/LocalSeo'));
const CompetitorAnalysis = lazy(() => import('./components/pages/CompetitorAnalysis'));
const AuditHistory = lazy(() => import('./components/pages/AuditHistory'));
const AuditReport = lazy(() => import('./components/pages/AuditReport'));
const Profile = lazy(() => import('./components/pages/Profile'));
const Onboarding = lazy(() => import('./components/pages/Onboarding'));
const ChangeAlerts = lazy(() => import('./components/pages/ChangeAlerts'));
const BulkAudit = lazy(() => import('./components/pages/BulkAudit'));
const CompareAudits = lazy(() => import('./components/pages/CompareAudits'));
const SupportTickets = lazy(() => import('./components/pages/SupportTickets'));
const BlogPage = lazy(() => import('./components/pages/BlogPage'));
const BlogPost = lazy(() => import('./components/pages/BlogPost'));
const MaxLayout = lazy(() => import('./components/pages/max/MaxLayout'));
const ApiKeysPage = lazy(() => import('./components/pages/max/ApiKeysPage'));
const TeamPage = lazy(() => import('./components/pages/max/TeamPage'));
const BrandingPage = lazy(() => import('./components/pages/max/BrandingPage'));
const WebhooksPage = lazy(() => import('./components/pages/max/WebhooksPage'));
const SiteSpeedTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.SiteSpeedTool })));
const BrokenLinksTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.BrokenLinksTool })));
const SitemapCheckerTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.SitemapCheckerTool })));
const RobotsTxtTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.RobotsTxtTool })));
const RedirectCheckerTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.RedirectCheckerTool })));
const SerpPreviewTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.SerpPreviewTool })));
const MetaAnalyzerTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.MetaAnalyzerTool })));
const SchemaGeneratorTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.SchemaGeneratorTool })));
const GeoOptimizerTool = lazy(() => import('./components/pages/tools/NewTools').then(m => ({ default: m.GeoOptimizerTool })));

function gated<T extends PlanFeature>(feature: T, Component: ComponentType, title?: string) {
  return function GatedPage() {
    return (
      <PlanGate feature={feature} title={title}>
        <Component />
      </PlanGate>
    );
  };
}

const GatedRankTracker = gated('rankTracker', RankTracker, 'Rank Tracker');
const GatedBacklinks = gated('backlinks', Backlinks, 'Backlink Analyzer');
const GatedAiVisibility = gated('aiVisibility', AiVisibility, 'AI Visibility');
const GatedContentGap = gated('contentGap', ContentGap, 'Content Gap');
const GatedLocalSeo = gated('localSeo', LocalSeo, 'Local SEO');
const GatedCompetitors = gated('competitorAnalysis', CompetitorAnalysis, 'Competitor Analysis');

function GatedChangeAlerts() {
  return (
    <PlanGate feature="changeAlerts" title="Change Alerts">
      <ChangeAlerts />
    </PlanGate>
  );
}

const GatedApiKeys = gated('apiAccess', ApiKeysPage, 'API Access');
const GatedTeam = gated('team', TeamPage, 'Team');
const GatedBranding = gated('whiteLabel', BrandingPage, 'White-label');
const GatedWebhooks = gated('webhooks', WebhooksPage, 'Webhooks');

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
              </div>
            }
          >
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/docs" element={<ApiDocs />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/tools" element={<Navigate to="/tools/keywords" replace />} />
            <Route path="/tools/rank-tracker" element={<GatedRankTracker />} />
            <Route path="/tools/backlinks" element={<GatedBacklinks />} />
            <Route path="/tools/ai-visibility" element={<GatedAiVisibility />} />
            <Route path="/tools/content-gap" element={<GatedContentGap />} />
            <Route path="/tools/local-seo" element={<GatedLocalSeo />} />
            <Route path="/tools/competitors" element={<GatedCompetitors />} />
            <Route path="/audits" element={<AuditHistory />} />
            <Route path="/audit/scan" element={<AuditScan />} />
            <Route path="/audit/:id" element={<AuditReport />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/alerts" element={<GatedChangeAlerts />} />
            <Route path="/bulk-audit" element={<BulkAudit />} />
            <Route path="/compare" element={<CompareAudits />} />
            <Route path="/support" element={<SupportTickets />} />
            <Route path="/team/accept/:token" element={<TeamAcceptPage />} />
            <Route path="/max" element={<MaxLayout />}>
              <Route index element={<Navigate to="/max/api-keys" replace />} />
              <Route path="api-keys" element={<GatedApiKeys />} />
              <Route path="team" element={<GatedTeam />} />
              <Route path="branding" element={<GatedBranding />} />
              <Route path="webhooks" element={<GatedWebhooks />} />
            </Route>
            <Route path="/tools/site-speed" element={<SiteSpeedTool />} />
            <Route path="/tools/broken-links" element={<BrokenLinksTool />} />
            <Route path="/tools/sitemap-checker" element={<SitemapCheckerTool />} />
            <Route path="/tools/robots-txt" element={<RobotsTxtTool />} />
            <Route path="/tools/redirect-checker" element={<RedirectCheckerTool />} />
            <Route path="/tools/serp-preview" element={<SerpPreviewTool />} />
            <Route path="/tools/meta-analyzer" element={<MetaAnalyzerTool />} />
            <Route path="/tools/schema-generator" element={<SchemaGeneratorTool />} />
            <Route path="/tools/geo-optimizer" element={<GeoOptimizerTool />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <CookieConsent />
    </BrowserRouter>
    </ToastProvider>
  );
}
