import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ScanLine, Users, BarChart3, Shield, Activity, CreditCard, Settings,
  Search, Mail, FileSearch, TrendingUp, Server, ExternalLink, RefreshCw, Link2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useInView } from '../../hooks/useInView';
import MetaTags from '../layout/MetaTags';

interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
  status: string;
  scans: number;
  joined: string;
  verified: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalAudits: number;
  totalAuditsAll: number;
  auditsThisWeek: number;
  proUsers: number;
  maxUsers: number;
  freeUsers: number;
  totalContacts: number;
  contactsThisWeek: number;
  avgAuditScore: number;
  verifiedUsers: number;
}

interface AuditRow {
  id: number;
  url: string;
  score: number;
  issues: number;
  warnings: number;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface ContactRow {
  id: number;
  name?: string;
  email: string;
  subject?: string;
  message: string;
  created_at: string;
}

interface GrowthDay {
  day: string;
  count: number;
}

interface StripeSettings {
  stripe_price_pro: string;
  stripe_price_max: string;
  stripe_payment_link_pro: string;
  stripe_payment_link_max: string;
  stripe_configured: boolean;
  stripe_webhook_url: string;
  plan_prices: { pro: number; max: number };
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [growth, setGrowth] = useState<GrowthDay[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null);
  const [stripeForm, setStripeForm] = useState({
    stripe_price_pro: '',
    stripe_price_max: '',
    stripe_payment_link_pro: '',
    stripe_payment_link_max: '',
  });
  const [stripeSaving, setStripeSaving] = useState(false);
  const [stripeMessage, setStripeMessage] = useState('');
  const { ref } = useInView(0.1);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audits', label: 'Audits', icon: FileSearch },
    { id: 'contacts', label: 'Contacts', icon: Mail },
    { id: 'revenue', label: 'Revenue', icon: CreditCard },
    { id: 'stripe', label: 'Stripe', icon: Link2 },
    { id: 'activity', label: 'Activity', icon: TrendingUp },
    { id: 'system', label: 'System', icon: Server },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin') {
        navigate('/admin-login');
        return;
      }
      loadData(token);
    } catch {
      navigate('/admin-login');
    }
  }, [navigate]);

  async function loadData(token: string, silent = false) {
    if (!silent) setError('');
    else setRefreshing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, statsRes, auditsRes, contactsRes, growthRes, settingsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/audits?limit=50', { headers }),
        fetch('/api/admin/contacts?limit=50', { headers }),
        fetch('/api/admin/growth', { headers }),
        fetch('/api/admin/settings', { headers }),
      ]);

      if (usersRes.status === 401 || usersRes.status === 403) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (auditsRes.ok) setAudits(await auditsRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (growthRes.ok) setGrowth(await growthRes.json());

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setStripeSettings(s);
        setStripeForm({
          stripe_price_pro: s.stripe_price_pro || '',
          stripe_price_max: s.stripe_price_max || '',
          stripe_payment_link_pro: s.stripe_payment_link_pro || '',
          stripe_payment_link_max: s.stripe_payment_link_max || '',
        });
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setUsers(usersData.map((u: {
            id: number; name?: string; email: string; plan: string;
            created_at?: string; scans?: number; email_verified?: number;
          }) => ({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            plan: (u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1),
            status: 'Active',
            scans: u.scans || 0,
            joined: u.created_at?.split('T')[0] || '—',
            verified: !!u.email_verified,
          })));
        }
      } else if (!statsRes.ok) {
        const err = await usersRes.json().catch(() => ({}));
        setError(typeof err.error === 'string' ? err.error : 'Failed to load admin data');
      }
    } catch {
      setError('Failed to load admin data — check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function changePlan(userId: number, plan: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan.toLowerCase() }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) =>
        u.id === userId ? { ...u, plan: plan.charAt(0).toUpperCase() + plan.slice(1) } : u
      ));
    }
  }

  async function saveStripeSettings() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setStripeSaving(true);
    setStripeMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(stripeForm),
      });
      const data = await res.json();
      if (res.ok) {
        setStripeMessage('Stripe settings saved');
        loadData(token, true);
      } else setStripeMessage(data.error || 'Failed to save');
    } catch {
      setStripeMessage('Failed to save settings');
    }
    setStripeSaving(false);
  }

  const filtered = users.filter((u) => {
    const match = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return match;
    return match && u.plan.toLowerCase() === filter;
  });

  const s = stats || {
    totalUsers: 0, totalAudits: 0, totalAuditsAll: 0, auditsThisWeek: 0,
    proUsers: 0, maxUsers: 0, freeUsers: 0, totalContacts: 0, contactsThisWeek: 0,
    avgAuditScore: 0, verifiedUsers: 0,
  };

  const mrr = s.proUsers * 12 + s.maxUsers * 29;
  const maxGrowth = Math.max(...growth.map((g) => g.count), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <MetaTags title="Admin — ValueScan" description="ValueScan admin panel." />

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-56 shrink-0">
              <nav className="space-y-1">
                {tabs.map((t) => (
                  <div key={t.id} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground">
                    <t.icon className="w-4 h-4" /> {t.label}
                  </div>
                ))}
              </nav>
            </aside>
            <main className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-3 w-16 bg-muted rounded" />
                      <div className="w-4 h-4 bg-muted rounded" />
                    </div>
                    <div className="h-7 w-20 bg-muted rounded mb-1" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-card border border-border animate-pulse">
                  <div className="h-5 w-32 bg-muted rounded mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 bg-muted rounded" />
                    ))}
                  </div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border animate-pulse">
                  <div className="h-5 w-28 bg-muted rounded mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-6 bg-muted rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/dashboard" className="text-primary hover:underline">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Admin — ValueScan" description="ValueScan admin panel." />

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-56 shrink-0">
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          <main ref={ref} className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            {tab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {refreshing
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-xl bg-card border border-border animate-pulse">
                          <div className="flex items-center justify-between mb-2">
                            <div className="h-3 w-16 bg-muted rounded" />
                            <div className="w-4 h-4 bg-muted rounded" />
                          </div>
                          <div className="h-7 w-20 bg-muted rounded mb-1" />
                          <div className="h-3 w-24 bg-muted rounded" />
                        </div>
                      ))
                    : [
                        { label: 'Total Users', value: s.totalUsers, icon: Users, sub: `${s.verifiedUsers} verified` },
                        { label: 'MRR', value: `£${mrr}`, icon: CreditCard, sub: `${s.proUsers + s.maxUsers} paid` },
                        { label: 'Scans Today', value: s.totalAudits, icon: BarChart3, sub: `${s.auditsThisWeek} this week` },
                        { label: 'Avg Score', value: s.avgAuditScore || '—', icon: Activity, sub: `${s.totalAuditsAll} total audits` },
                      ].map((card) => (
                        <div key={card.label} className="p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">{card.label}</span>
                            <card.icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                        </div>
                      ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-card border border-border">
                    <h3 className="font-semibold mb-4">Recent audits</h3>
                    <div className="space-y-2">
                      {audits.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{a.url}</p>
                            <p className="text-xs text-muted-foreground">{a.user_email || 'Guest'} · {a.created_at?.split('T')[0]}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              a.score >= 80 ? 'bg-green-500/10 text-green-500' : a.score >= 60 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                            }`}>{a.score}</span>
                            <Link to={`/audit/${a.id}`} className="text-primary hover:underline"><ExternalLink className="w-3.5 h-3.5" /></Link>
                          </div>
                        </div>
                      ))}
                      {audits.length === 0 && <p className="text-sm text-muted-foreground">No audits yet</p>}
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border">
                    <h3 className="font-semibold mb-4">Plan breakdown</h3>
                    <div className="space-y-3">
                      {[
                        { plan: 'Free', count: s.freeUsers, color: 'bg-gray-500' },
                        { plan: 'Pro', count: s.proUsers, color: 'bg-primary' },
                        { plan: 'Max', count: s.maxUsers, color: 'bg-purple-500' },
                      ].map((p) => (
                        <div key={p.plan}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{p.plan}</span>
                            <span className="text-muted-foreground">{p.count} users</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.color}`}
                              style={{ width: `${s.totalUsers ? (p.count / s.totalUsers) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Contact messages</p>
                      <p className="text-lg font-bold">{s.totalContacts} <span className="text-sm font-normal text-muted-foreground">({s.contactsThisWeek} this week)</span></p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold">Users ({filtered.length})</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-card border border-border text-sm outline-none focus:border-primary/50 w-48"
                      />
                    </div>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm outline-none focus:border-primary/50"
                    >
                      <option value="all">All plans</option>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scans</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Verified</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              u.plan === 'Max' ? 'bg-purple-500/10 text-purple-500' : u.plan === 'Pro' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>{u.plan}</span>
                          </td>
                          <td className="px-4 py-3">{u.scans}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${u.verified ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {u.verified ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{u.joined}</td>
                          <td className="px-4 py-3">
                            <select
                              value={u.plan.toLowerCase()}
                              onChange={(e) => changePlan(u.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border border-border bg-background"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="max">Max</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {tab === 'audits' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">All Audits ({audits.length})</h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">URL</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issues</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((a) => (
                        <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium max-w-[200px] truncate">{a.url}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${a.score >= 80 ? 'text-green-500' : a.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{a.score}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{a.issues} issues · {a.warnings} warnings</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.user_email || 'Guest'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.created_at?.split('T')[0]}</td>
                          <td className="px-4 py-3">
                            <Link to={`/audit/${a.id}`} className="text-primary hover:underline text-xs">View report</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {audits.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No audits recorded yet</p>}
                </div>
              </motion.div>
            )}

            {tab === 'contacts' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">Contact Messages ({contacts.length})</h2>
                <div className="space-y-4">
                  {contacts.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="font-medium">{c.name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{c.created_at?.split('T')[0]}</span>
                      </div>
                      {c.subject && <p className="text-sm font-medium mb-1">{c.subject}</p>}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.message}</p>
                    </div>
                  ))}
                  {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contact messages yet</p>}
                </div>
              </motion.div>
            )}

            {tab === 'revenue' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">Revenue</h2>
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="p-5 rounded-xl bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Monthly recurring</p>
                    <p className="text-3xl font-bold">£{mrr}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Pro subscribers</p>
                    <p className="text-3xl font-bold">{s.proUsers}</p>
                    <p className="text-xs text-muted-foreground mt-1">£{s.proUsers * 12}/mo</p>
                  </div>
                  <div className="p-5 rounded-xl bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Max subscribers</p>
                    <p className="text-3xl font-bold">{s.maxUsers}</p>
                    <p className="text-xs text-muted-foreground mt-1">£{s.maxUsers * 29}/mo</p>
                  </div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold mb-4">Revenue by plan</h3>
                  <div className="space-y-3">
                    {[
                      { plan: 'Free', count: s.freeUsers, revenue: 0 },
                      { plan: 'Pro (£12/mo)', count: s.proUsers, revenue: s.proUsers * 12 },
                      { plan: 'Max (£29/mo)', count: s.maxUsers, revenue: s.maxUsers * 29 },
                    ].map((p) => (
                      <div key={p.plan} className="flex items-center justify-between text-sm">
                        <span>{p.plan} <span className="text-muted-foreground">({p.count})</span></span>
                        <span className="font-bold">£{p.revenue.toLocaleString()}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'stripe' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-2">Stripe & billing</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure checkout for Pro (£{stripeSettings?.plan_prices?.pro ?? 12}/mo) and Max (£{stripeSettings?.plan_prices?.max ?? 29}/mo).
                  Payment links take priority over Price IDs when set.
                </p>

                <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
                  <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Pro plan
                    </h3>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Stripe Price ID</label>
                      <input
                        value={stripeForm.stripe_price_pro}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripe_price_pro: e.target.value }))}
                        placeholder="price_1ProMonthly..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">From Stripe → Products → Pro → Pricing</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Payment link (optional)</label>
                      <input
                        value={stripeForm.stripe_payment_link_pro}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripe_payment_link_pro: e.target.value }))}
                        placeholder="https://buy.stripe.com/..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Max plan
                    </h3>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Stripe Price ID</label>
                      <input
                        value={stripeForm.stripe_price_max}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripe_price_max: e.target.value }))}
                        placeholder="price_1MaxMonthly..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Payment link (optional)</label>
                      <input
                        value={stripeForm.stripe_payment_link_max}
                        onChange={(e) => setStripeForm((f) => ({ ...f, stripe_payment_link_max: e.target.value }))}
                        placeholder="https://buy.stripe.com/..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl border border-border bg-muted/20 max-w-4xl text-sm space-y-2">
                  <p>
                    <span className="font-medium">Stripe SDK:</span>{' '}
                    <span className={stripeSettings?.stripe_configured ? 'text-green-500' : 'text-amber-500'}>
                      {stripeSettings?.stripe_configured ? 'Configured (STRIPE_SECRET_KEY in .env)' : 'Not configured — set STRIPE_SECRET_KEY on server'}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Webhook URL:</span>{' '}
                    <code className="text-xs bg-background px-2 py-0.5 rounded">{stripeSettings?.stripe_webhook_url}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">Add this URL in Stripe → Developers → Webhooks. Events: checkout.session.completed, customer.subscription.deleted</p>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={saveStripeSettings}
                    disabled={stripeSaving}
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {stripeSaving ? 'Saving…' : 'Save Stripe settings'}
                  </button>
                  {stripeMessage && <span className="text-sm text-muted-foreground">{stripeMessage}</span>}
                </div>
              </motion.div>
            )}

            {tab === 'activity' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">Growth & Activity</h2>
                <div className="p-6 rounded-xl bg-card border border-border mb-6">
                  <h3 className="font-semibold mb-4">New signups (14 days)</h3>
                  {growth.length > 0 ? (
                    <div className="flex items-end gap-1 h-32">
                      {growth.map((g) => (
                        <div key={g.day} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-primary/80 rounded-t"
                            style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: g.count ? 4 : 0 }}
                            title={`${g.day}: ${g.count}`}
                          />
                          <span className="text-[9px] text-muted-foreground rotate-0 truncate w-full text-center">{g.day.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No signup data yet</p>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs text-muted-foreground">Audits this week</p>
                    <p className="text-2xl font-bold">{s.auditsThisWeek}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs text-muted-foreground">Messages this week</p>
                    <p className="text-2xl font-bold">{s.contactsThisWeek}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'system' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">System Health</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'API Server', status: 'Online', ok: true },
                    { label: 'Database', status: 'SQLite connected', ok: true },
                    { label: 'Audit Engine', status: 'Operational', ok: true },
                    { label: 'Email Service', status: 'Ready', ok: true },
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.status}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${item.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-xl bg-card border border-border">
                  <p className="text-sm text-muted-foreground">
                    Total audits in database: <strong className="text-foreground">{s.totalAuditsAll}</strong> ·
                    Average score: <strong className="text-foreground">{s.avgAuditScore || '—'}</strong>
                  </p>
                </div>
              </motion.div>
            )}

            {tab === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">Security</h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Admin authentication</span>
                      <span className="text-xs text-green-500 font-medium">JWT protected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">All admin routes require a valid admin JWT token.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Verified users</span>
                      <span className="text-xs text-muted-foreground">{s.verifiedUsers} / {s.totalUsers}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Email verification rate: {s.totalUsers ? Math.round((s.verifiedUsers / s.totalUsers) * 100) : 0}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Rate limiting</span>
                      <span className="text-xs text-green-500 font-medium">Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Audit endpoints are rate-limited per IP and per user plan.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'settings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold mb-6">Settings</h2>
                <div className="space-y-4 max-w-lg">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <label className="text-sm font-medium block mb-2">Site name</label>
                    <input type="text" defaultValue="ValueScan" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary/50" />
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <label className="text-sm font-medium block mb-2">Support email</label>
                    <input type="email" defaultValue="support@valuescan.online" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary/50" />
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <label className="text-sm font-medium block mb-2">Pro plan price</label>
                    <input type="text" defaultValue="Pro £12/mo · Max £29/mo" disabled className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground" />
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Save changes</button>
                </div>
              </motion.div>
            )}
          </main>
        </div>
    </div>
  );
}
