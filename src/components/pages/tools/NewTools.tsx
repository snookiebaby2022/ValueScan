import { Gauge, Link2, FileCode, Bot, MapPin, Search, Code2, GitBranch, FileText } from 'lucide-react';
import GenericToolPage from '../../tools/GenericToolPage';
import { getToolByPath } from '../../../lib/tools-catalog';

const defaults = {
  sample: [
    { label: 'Overall status', value: 'Needs attention', status: 'warn' as const },
    { label: 'Critical issues', value: '2 found', status: 'bad' as const },
    { label: 'Warnings', value: '5 found', status: 'warn' as const },
    { label: 'Passed checks', value: '18', status: 'good' as const },
  ],
};

export function SiteSpeedTool() {
  const tool = getToolByPath('/tools/site-speed')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<Gauge className="w-3 h-3" />}
      sampleResults={[
        { label: 'LCP (est.)', value: '2.4s', status: 'warn' },
        { label: 'FID (est.)', value: '45ms', status: 'good' },
        { label: 'CLS (est.)', value: '0.08', status: 'good' },
        { label: 'TTFB', value: '680ms', status: 'warn' },
        { label: 'Page size', value: '1.2 MB', status: 'warn' },
      ]}
      tips={['Enable Brotli/gzip compression', 'Preload hero images', 'Defer non-critical JavaScript', 'Use a CDN for static assets']}
    />
  );
}

export function BrokenLinksTool() {
  const tool = getToolByPath('/tools/broken-links')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<Link2 className="w-3 h-3" />}
      sampleResults={[
        { label: 'Links checked', value: '47', status: 'good' },
        { label: 'Broken (404)', value: '3', status: 'bad' },
        { label: 'Redirects', value: '5', status: 'warn' },
        { label: 'External links', value: '12', status: 'good' },
      ]}
      tips={['Fix or remove 404 links', 'Update internal links after URL changes', 'Set up 301 redirects for moved pages']}
    />
  );
}

export function SitemapCheckerTool() {
  const tool = getToolByPath('/tools/sitemap-checker')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<FileCode className="w-3 h-3" />}
      sampleResults={[
        { label: 'Sitemap found', value: 'Yes', status: 'good' },
        { label: 'URLs listed', value: '128', status: 'good' },
        { label: 'Orphan pages', value: '4', status: 'warn' },
        { label: 'Last modified', value: '3 days ago', status: 'good' },
      ]}
      tips={['Submit sitemap in Google Search Console', 'Include only canonical URLs', 'Split large sitemaps into chunks of 50k URLs']}
    />
  );
}

export function RobotsTxtTool() {
  const tool = getToolByPath('/tools/robots-txt')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<Bot className="w-3 h-3" />}
      sampleResults={[
        { label: 'robots.txt found', value: 'Yes', status: 'good' },
        { label: 'Sitemap reference', value: 'Present', status: 'good' },
        { label: 'Disallow rules', value: '2 paths', status: 'good' },
        { label: 'Blocked important pages', value: 'None', status: 'good' },
      ]}
      tips={['Never block CSS/JS in robots.txt', 'Reference your XML sitemap', 'Test with Google Search Console robots tester']}
    />
  );
}

export function RedirectCheckerTool() {
  const tool = getToolByPath('/tools/redirect-checker')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<GitBranch className="w-3 h-3" />}
      sampleResults={[
        { label: 'Final URL', value: 'HTTPS 200', status: 'good' },
        { label: 'Redirect hops', value: '1', status: 'good' },
        { label: 'Redirect type', value: '301 Permanent', status: 'good' },
        { label: 'Chain length', value: 'OK', status: 'good' },
      ]}
      tips={['Use 301 for permanent moves', 'Avoid redirect chains longer than 2 hops', 'Update internal links to final URLs']}
    />
  );
}

export function SerpPreviewTool() {
  const tool = getToolByPath('/tools/serp-preview')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<Search className="w-3 h-3" />}
      sampleResults={[
        { label: 'Title length', value: '58 chars', status: 'good' },
        { label: 'Description length', value: '142 chars', status: 'good' },
        { label: 'OG image', value: 'Missing', status: 'bad' },
        { label: 'Snippet preview', value: 'Ready', status: 'good' },
      ]}
      tips={['Keep titles under 60 characters', 'Write unique meta descriptions per page', 'Add og:image for social sharing']}
    />
  );
}

export function MetaAnalyzerTool() {
  const tool = getToolByPath('/tools/meta-analyzer')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<FileText className="w-3 h-3" />}
      sampleResults={defaults.sample}
      tips={['One H1 per page', 'Unique title and description per URL', 'Add canonical tags on duplicate content']}
    />
  );
}

export function SchemaGeneratorTool() {
  const tool = getToolByPath('/tools/schema-generator')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<Code2 className="w-3 h-3" />}
      sampleResults={[
        { label: 'JSON-LD blocks', value: '0 found', status: 'bad' },
        { label: 'Organization schema', value: 'Missing', status: 'warn' },
        { label: 'WebSite schema', value: 'Missing', status: 'warn' },
        { label: 'Breadcrumb schema', value: 'N/A', status: 'good' },
      ]}
      tips={['Add Organization + WebSite schema on homepage', 'Use FAQ schema for help pages', 'Validate with Google Rich Results Test']}
    />
  );
}

export function GeoOptimizerTool() {
  const tool = getToolByPath('/tools/geo-optimizer')!;
  return (
    <GenericToolPage
      tool={tool}
      icon={<MapPin className="w-3 h-3" />}
      sampleResults={[
        { label: 'Brand mentions', value: 'Low', status: 'warn' },
        { label: 'Structured facts', value: 'Partial', status: 'warn' },
        { label: 'FAQ coverage', value: 'Good', status: 'good' },
        { label: 'AI citation readiness', value: '62%', status: 'warn' },
      ]}
      tips={['Publish clear factual content about your product', 'Use schema markup for entities', 'Maintain consistent NAP across the web']}
    />
  );
}
