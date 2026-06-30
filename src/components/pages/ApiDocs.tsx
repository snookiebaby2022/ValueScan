import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Copy, Check, Code2, Terminal, Lock, Globe, Server, Key, Play, X } from 'lucide-react';
import { useState } from 'react';
import MetaTags from '../layout/MetaTags';

const endpoints = [
  { category: 'Audit', method: 'POST', path: '/api/audit', desc: 'Run a full website audit on any URL.', params: [{ name: 'url', type: 'string', required: true, desc: 'The website URL to audit' }], response: `{\n  "score": 87,\n  "issues": 12,\n  "warnings": 8,\n  "recommendations": [...],\n  "reportId": "123"\n}` },
  { category: 'Audit', method: 'GET', path: '/api/audit/:id', desc: 'Retrieve a previously generated audit report.', params: [{ name: 'id', type: 'string', required: true, desc: 'The report ID from /api/audit' }], response: `{\n  "id": "123",\n  "url": "https://example.com",\n  "score": 87,\n  "report": { ... },\n  "created_at": "2026-06-18T12:00:00Z"\n}` },
  { category: 'Audit', method: 'GET', path: '/api/audit/history', desc: 'Get your audit history (authenticated).', params: [], response: `{\n  "audits": [\n    { "id": 1, "url": "...", "score": 87, "created_at": "..." }\n  ]\n}` },
  { category: 'Audit', method: 'POST', path: '/api/audit/bulk', desc: 'Run up to 10 audits at once (authenticated).', params: [{ name: 'urls', type: 'array', required: true, desc: 'Array of URLs to audit' }], response: `{\n  "success": true,\n  "results": [...]\n}` },
  { category: 'Audit', method: 'GET', path: '/api/audit/compare', desc: 'Compare two audits (authenticated).', params: [{ name: 'id1', type: 'string', required: true, desc: 'First audit ID' }, { name: 'id2', type: 'string', required: true, desc: 'Second audit ID' }], response: `{\n  "diff": { "score": 5, "issues": -2 },\n  "categoryDiff": { ... }\n}` },
  { category: 'Auth', method: 'POST', path: '/api/auth/register', desc: 'Create a new user account.', params: [{ name: 'name', type: 'string', required: true, desc: 'Full name' }, { name: 'email', type: 'string', required: true, desc: 'Email address' }, { name: 'password', type: 'string', required: true, desc: 'Min 8 characters' }], response: `{\n  "token": "eyJhbGciOiJIUzI1NiIs...",\n  "user": { ... }\n}` },
  { category: 'Auth', method: 'POST', path: '/api/auth/login', desc: 'Authenticate an existing user.', params: [{ name: 'email', type: 'string', required: true, desc: 'Email address' }, { name: 'password', type: 'string', required: true, desc: 'Password' }], response: `{\n  "token": "eyJhbGciOiJIUzI1NiIs...",\n  "user": { ... }\n}` },
  { category: 'Auth', method: 'POST', path: '/api/auth/forgot-password', desc: 'Send a password reset email.', params: [{ name: 'email', type: 'string', required: true, desc: 'Registered email address' }], response: `{\n  "success": true,\n  "message": "Reset link sent"\n}` },
  { category: 'Auth', method: 'POST', path: '/api/auth/reset-password', desc: 'Reset password using a reset token.', params: [{ name: 'token', type: 'string', required: true, desc: 'Reset token from email' }, { name: 'password', type: 'string', required: true, desc: 'New password (min 8 chars)' }], response: `{\n  "success": true,\n  "message": "Password updated"\n}` },
  { category: 'Tools', method: 'GET', path: '/api/pagespeed', desc: 'Get Google PageSpeed Insights scores for a URL.', params: [{ name: 'url', type: 'string', required: true, desc: 'Website URL' }], response: `{\n  "lighthouse": {\n    "performance": 92,\n    "seo": 100,\n    "accessibility": 95\n  }\n}` },
  { category: 'Tools', method: 'GET', path: '/api/keywords/ideas', desc: 'Get keyword research data (DataForSEO).', params: [{ name: 'query', type: 'string', required: true, desc: 'Keyword to research' }], response: `{\n  "keywords": [\n    { "keyword": "seo audit", "volume": 5400, "difficulty": 42 }\n  ]\n}` },
  { category: 'Tools', method: 'GET', path: '/api/keywords/domain', desc: 'Get keywords a domain ranks for (DataForSEO).', params: [{ name: 'domain', type: 'string', required: true, desc: 'Domain to analyze' }], response: `{\n  "keywords": [\n    { "keyword": "seo tool", "position": 3, "volume": 1200 }\n  ]\n}` },
  { category: 'Tools', method: 'GET', path: '/api/serp', desc: 'Get SERP results for a keyword (DataForSEO).', params: [{ name: 'keyword', type: 'string', required: true, desc: 'Keyword to check' }], response: `{\n  "results": [\n    { "position": 1, "url": "...", "title": "..." }\n  ]\n}` },
  { category: 'Tools', method: 'GET', path: '/api/sitemap', desc: 'Crawl a site and generate an XML sitemap.', params: [{ name: 'url', type: 'string', required: true, desc: 'Website URL' }], response: `{\n  "urls": [\n    { "url": "https://example.com/", "priority": 1.0, "changefreq": "daily" }\n  ]\n}` },
  { category: 'Tools', method: 'GET', path: '/api/schema', desc: 'Validate JSON-LD schema markup on a page.', params: [{ name: 'url', type: 'string', required: true, desc: 'Website URL' }], response: `{\n  "schema": [...],\n  "openGraph": { ... },\n  "twitterCard": { ... }\n}` },
  { category: 'Account', method: 'GET', path: '/api/quota', desc: 'Get your current usage and limits.', params: [], response: `{\n  "plan": "pro",\n  "limits": { "audits": 50, "alerts": 10 },\n  "used": { "audits": 12, "alerts": 3 }\n}` },
  { category: 'Account', method: 'GET', path: '/api/alerts', desc: 'Get your change alerts.', params: [], response: `{\n  "alerts": [\n    { "id": 1, "url": "https://example.com", "check_type": "score_change" }\n  ]\n}` },
  { category: 'Account', method: 'POST', path: '/api/alerts', desc: 'Create a new change alert.', params: [{ name: 'url', type: 'string', required: true, desc: 'URL to monitor' }], response: `{\n  "success": true,\n  "alert": { ... }\n}` },
  { category: 'Account', method: 'POST', path: '/api/tickets', desc: 'Create a support ticket.', params: [{ name: 'subject', type: 'string', required: true, desc: 'Ticket subject' }, { name: 'message', type: 'string', required: true, desc: 'Ticket message' }], response: `{\n  "success": true,\n  "id": 123\n}` },
  { category: 'Public API', method: 'POST', path: '/api/v1/audit', desc: 'Public API — run an audit using X-API-Key header.', params: [{ name: 'url', type: 'string', required: true, desc: 'Website URL' }], headers: ['X-API-Key: your_api_key'], response: `{\n  "score": 87,\n  "issues": 12,\n  "warnings": 8,\n  "categories": { ... }\n}` },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-500',
  POST: 'bg-blue-500/10 text-blue-500',
  PUT: 'bg-amber-500/10 text-amber-500',
  DELETE: 'bg-red-500/10 text-red-500',
};

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (

    <div className="relative mt-2 rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#161b22]">
        <span className="text-xs text-[#8b949e]">JSON</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto text-[#e6edf3]"><code>{code}</code></pre>
    </div>
  );
}

function TryItModal({ ep, onClose }: { ep: typeof endpoints[0]; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [curlCopied, setCurlCopied] = useState(false);

  const buildCurl = () => {
    const base = 'https://valuescan.online';
    let url = base + ep.path;
    const bodyParams = ep.params.filter((p) => p.name !== 'id' && !ep.path.includes(':' + p.name));
    const pathParams = ep.params.filter((p) => ep.path.includes(':' + p.name));

    pathParams.forEach((p) => {
      url = url.replace(':' + p.name, values[p.name] || ':' + p.name);
    });

    const headers = ep.headers ? ep.headers.map((h) => `-H "${h}"`).join(' \\\n  ') : `-H "Authorization: Bearer your_token"`;
    let curl = `curl -X ${ep.method} \\\n  ${headers} \\\n  -H "Content-Type: application/json"`;

    if (bodyParams.length > 0) {
      const body: Record<string, string> = {};
      bodyParams.forEach((p) => { body[p.name] = values[p.name] || ''; });
      curl += ` \\\n  -d '${JSON.stringify(body)}'`;
    }
    curl += ` \\\n  "${url}"`;
    return curl;
  };

  const curl = buildCurl();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${methodColors[ep.method]}`}>{ep.method}</span>
            <code className="text-sm font-mono">{ep.path}</code>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/50 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{ep.desc}</p>

        {ep.params.length > 0 && (
          <div className="space-y-3 mb-4">
            {ep.params.map((p) => (
              <div key={p.name}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{p.name} {p.required && <span className="text-red-500">*</span>}</label>
                <input
                  type="text"
                  placeholder={p.desc}
                  value={values[p.name] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/50"
                />
              </div>
            ))}
          </div>
        )}

        <div className="relative rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#161b22]">
            <span className="text-xs text-[#8b949e]">cURL</span>
            <button
              onClick={() => { navigator.clipboard.writeText(curl); setCurlCopied(true); setTimeout(() => setCurlCopied(false), 2000); }}
              className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-white transition-colors"
            >
              {curlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {curlCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-4 text-sm overflow-x-auto text-[#e6edf3]"><code>{curl}</code></pre>
        </div>
      </motion.div>
    </div>
  );
}

export default function ApiDocs() {
  const [tryIt, setTryIt] = useState<typeof endpoints[0] | null>(null);

  const groups = endpoints.reduce((acc, ep) => {
    if (!acc[ep.category]) acc[ep.category] = [];
    acc[ep.category].push(ep);
    return acc;
  }, {} as Record<string, typeof endpoints>);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="API Documentation — ValueScan" description="ValueScan API docs." />


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="lg:w-56 shrink-0">
            <nav className="space-y-1 sticky top-24">
              <a href="#overview" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Globe className="w-4 h-4" /> Overview
              </a>
              <a href="#auth" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Lock className="w-4 h-4" /> Authentication
              </a>
              <a href="#audit" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Server className="w-4 h-4" /> Audit
              </a>
              <a href="#endpoints" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Code2 className="w-4 h-4" /> All endpoints
              </a>
              <a href="#public-api" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Key className="w-4 h-4" /> Public API
              </a>
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-3xl font-bold tracking-tight mb-3">API Documentation</h1>
              <p className="text-muted-foreground mb-10">Build on top of ValueScan. Run audits, manage alerts, and access all platform features programmatically.</p>

              <section id="overview" className="mb-14">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Terminal className="w-5 h-5 text-primary" /> Overview</h2>
                <div className="p-5 rounded-xl bg-card border border-border">
                  <p className="text-sm text-muted-foreground mb-3">Base URL</p>
                  <CodeBlock code={`https://valuescan.online/api`} />
                  <p className="text-sm text-muted-foreground mt-4 mb-2">All endpoints return JSON. Use standard HTTP verbs.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Rate limit (Free)</p>
                      <p className="text-sm font-medium">3 audits/day</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Rate limit (Pro/Max)</p>
                      <p className="text-sm font-medium">50+ audits/day</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Auth</p>
                      <p className="text-sm font-medium">Bearer token or X-API-Key</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Max bulk</p>
                      <p className="text-sm font-medium">10 URLs per request</p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="auth" className="mb-14">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Authentication</h2>
                <p className="text-sm text-muted-foreground mb-4">Include your API key in the Authorization header of every request.</p>
                <CodeBlock code={`Authorization: Bearer your_api_key_here`} />
                <p className="text-sm text-muted-foreground mt-4">Get your API key from the <Link to="/max/api-keys" className="text-primary hover:underline">Max → API Keys</Link> page.</p>
              </section>

              <section id="endpoints" className="mb-14">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Code2 className="w-5 h-5 text-primary" /> Endpoints</h2>
                <div className="space-y-12">
                  {Object.entries(groups).map(([category, eps]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{category}</h3>
                      <div className="space-y-4">
                        {eps.map((ep, i) => (
                          <div key={i} className="rounded-xl border border-border overflow-hidden">
                            <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${methodColors[ep.method]}`}>{ep.method}</span>
                                <code className="text-sm font-mono">{ep.path}</code>
                              </div>
                              <button
                                onClick={() => setTryIt(ep)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                              >
                                <Play className="w-3 h-3" /> Try it
                              </button>
                            </div>
                            <div className="p-5">
                              <p className="text-sm text-muted-foreground mb-4">{ep.desc}</p>
                              {ep.headers && (
                                <div className="mb-4">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Headers</p>
                                  <ul className="text-sm space-y-1">
                                    {ep.headers.map((h, j) => <li key={j}><code className="text-xs font-mono bg-muted/50 px-1 rounded">{h}</code></li>)}
                                  </ul>
                                </div>
                              )}
                              {ep.params.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Parameters</p>
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-muted-foreground">
                                        <th className="pb-2 font-medium">Name</th>
                                        <th className="pb-2 font-medium">Type</th>
                                        <th className="pb-2 font-medium">Required</th>
                                        <th className="pb-2 font-medium">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ep.params.map((p, j) => (
                                        <tr key={j} className="border-t border-border">
                                          <td className="py-2 font-mono text-xs">{p.name}</td>
                                          <td className="py-2 text-xs text-muted-foreground">{p.type}</td>
                                          <td className="py-2 text-xs">{p.required ? <span className="text-red-500">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                                          <td className="py-2 text-xs text-muted-foreground">{p.desc}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Example response</p>
                              <CodeBlock code={ep.response} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          </main>
        </div>
      </div>
      {tryIt && <TryItModal ep={tryIt} onClose={() => setTryIt(null)} />}
    </div>
  );
}
