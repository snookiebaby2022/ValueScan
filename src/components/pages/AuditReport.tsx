import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, AlertCircle, Shield, Zap, Globe, TrendingUp, Calendar, ExternalLink, Loader2, Download, Wrench, Copy, Share, Check, FileText } from 'lucide-react';
import { API_BASE, authHeaders } from '../../lib/api';
import { suggestFix } from '../../lib/audit-fixes';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';

interface CheckResult {
  type: string;
  message: string;
  fix?: string;
}

interface Category {
  score: number;
  max: number;
  checks: CheckResult[];
}

interface AuditData {
  id: number;
  url: string;
  score: number;
  issues: number;
  warnings: number;
  created_at: string;
  report: {
    categories: {
      seo: Category;
      sem: Category;
      security: Category;
      performance: Category;
    };
  };
}

export default function AuditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'seo' | 'sem' | 'security' | 'performance'>('seo');
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/api/audit/${id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else { setAudit(data); }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load report'); setLoading(false); });
  }, [id, token, navigate]);

  const scoreColor = (s: number) => s >= 80 ? 'text-green-600' : s >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBar = (s: number, max: number) => {
    const pct = Math.round((s / max) * 100);
    const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
    return <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"><div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>;
  };

  const checkIcon = (type: string) => {
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    if (type === 'error') return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
    return <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const tabs = [
    { key: 'seo' as const, label: 'SEO', icon: Globe, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'sem' as const, label: 'SEM', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'security' as const, label: 'Security', icon: Shield, color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'performance' as const, label: 'Performance', icon: Zap, color: 'text-orange-600 dark:text-orange-400' },
  ];

  const handleDownload = () => {
    if (!audit) return;
    const dataStr = JSON.stringify(audit.report, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${audit.id}-${audit.url.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allIssues = audit
    ? (Object.values(audit.report.categories) as Category[]).flatMap((cat) =>
        cat.checks.filter((c) => c.type === 'error' || c.type === 'warning'),
      )
    : [];

  const copyFix = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Audit Report — ValueScan" description="Detailed website audit report." />
      <Breadcrumb />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error} <button onClick={() => navigate('/audits')} className="text-purple-600 underline ml-2">Back to History</button></div>
          ) : audit ? (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 transition-colors mb-2">
                    <ArrowLeft className="w-4 h-4" /> Back to home
                  </button>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-purple-500" /> Audit Report
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <span className="truncate max-w-[160px] sm:max-w-[300px]">{audit.url}</span>
                    <span className="text-slate-300">|</span>
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleShare} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                  <button onClick={() => window.alert('Coming soon')} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Download PDF
                  </button>
                  <button onClick={handleDownload} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export JSON
                  </button>
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-center justify-center flex-wrap gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 ${audit.score >= 80 ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : audit.score >= 50 ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                      {audit.score}
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Overall Score</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {audit.score >= 80 ? 'Excellent' : audit.score >= 50 ? 'Needs Improvement' : 'Critical Issues'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        {audit.issues > 0 && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {audit.issues} errors</span>}
                        {audit.warnings > 0 && <span className="text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {audit.warnings} warnings</span>}
                        {audit.issues === 0 && audit.warnings === 0 && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> No issues</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {tabs.map(tab => {
                    const cat = audit.report.categories[tab.key];
                    const pct = Math.round((cat.score / cat.max) * 100);
                    return (
                      <div key={tab.key} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tab.label}</span>
                          <span className={`text-sm font-semibold ${scoreColor(pct)}`}>{pct}%</span>
                        </div>
                        {scoreBar(cat.score, cat.max)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {allIssues.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800/50 p-6 mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Wrench className="w-5 h-5 text-amber-500" />
                    Recommended fixes ({allIssues.length})
                  </h2>
                  <div className="space-y-4">
                    {allIssues.map((check, i) => {
                      const fix = check.fix || suggestFix(check.message);
                      if (!fix) return null;
                      return (
                        <details key={i} className="group rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 open:bg-amber-100/50 dark:open:bg-amber-900/20">
                          <summary className="flex items-center gap-2 p-4 cursor-pointer list-none text-sm font-medium text-slate-800 dark:text-slate-200 select-none">
                            {checkIcon(check.type)}
                            <span className="flex-1">{check.message}</span>
                            <span className="text-xs text-muted-foreground opacity-0 group-open:opacity-100 transition-opacity">Click to expand</span>
                          </summary>
                          <div className="px-4 pb-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{fix}</p>
                            <button
                              type="button"
                              onClick={() => copyFix(fix)}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                            >
                              <Copy className="w-3 h-3" /> Copy fix steps
                            </button>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                  {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? `border-purple-500 ${tab.color} bg-purple-50 dark:bg-purple-900/20` : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {audit.report.categories[activeTab].checks.map((check, i) => {
                      const fix = check.fix || (check.type !== 'success' ? suggestFix(check.message) : null);
                      return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        {checkIcon(check.type)}
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300">{check.message}</p>
                          {check.type === 'success' && <p className="text-xs text-green-600 mt-0.5">Passed</p>}
                          {check.type === 'warning' && <p className="text-xs text-amber-600 mt-0.5">Warning</p>}
                          {check.type === 'error' && <p className="text-xs text-red-600 mt-0.5">Issue</p>}
                          {fix && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-3 border-l-2 border-purple-300 dark:border-purple-700">
                              <span className="font-medium text-purple-600 dark:text-purple-400">How to fix: </span>
                              {fix}
                            </p>
                          )}
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
