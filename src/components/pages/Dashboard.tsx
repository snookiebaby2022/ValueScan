import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Link as LinkIcon,
  BarChart3,
  MapPin,
  Settings,
  Send,
  Maximize2,
  Mic,
  History,
  Bot,
  TrendingUp,
  Eye,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Search,
  Bell,
  Zap,
  Hash,
  Newspaper,
  Linkedin,
  Twitter,
  Clock,
  Sparkles,
  Key,
  Target,
  Compass,
  ScanLine,
} from "lucide-react";
import { useInView } from "../../hooks/useInView";
import cn from "../../lib/utils";
import { API_BASE, authHeaders } from "../../lib/api";
import NotificationBell from "../layout/NotificationBell";
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';

/* ── Types ─────────────────────────────────────────────────────────── */

type TabKey = "traffic" | "seo" | "links" | "technical" | "geo";

interface AgentItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "active" | "idle" | "paused";
  lastRun: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "traffic", label: "Traffic", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "seo", label: "SEO", icon: <Search className="w-4 h-4" /> },
  { key: "links", label: "Links", icon: <LinkIcon className="w-4 h-4" /> },
  { key: "technical", label: "Technical", icon: <Settings className="w-4 h-4" /> },
  { key: "geo", label: "GEO", icon: <MapPin className="w-4 h-4" /> },
];

const AGENTS: AgentItem[] = [
  { id: "1", name: "X Influencer Agent", icon: <Twitter className="w-4 h-4" />, status: "active", lastRun: "2 min ago" },
  { id: "2", name: "Reddit Agent", icon: <Hash className="w-4 h-4" />, status: "active", lastRun: "5 min ago" },
  { id: "3", name: "SEO Agent", icon: <Search className="w-4 h-4" />, status: "active", lastRun: "12 min ago" },
  { id: "4", name: "X Agent", icon: <Twitter className="w-4 h-4" />, status: "idle", lastRun: "1 hr ago" },
  { id: "5", name: "Articles Agent", icon: <Newspaper className="w-4 h-4" />, status: "active", lastRun: "18 min ago" },
  { id: "6", name: "Hacker News Agent", icon: <Zap className="w-4 h-4" />, status: "paused", lastRun: "3 hr ago" },
  { id: "7", name: "LinkedIn Agent", icon: <Linkedin className="w-4 h-4" />, status: "active", lastRun: "8 min ago" },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hi! I'm your AI CMO. I can help you analyze traffic, optimize SEO, and grow your brand. What would you like to work on today?",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    role: "user",
    content: "Can you analyze our last 7 days traffic and suggest improvements?",
    timestamp: "10:31 AM",
  },
  {
    id: "3",
    role: "assistant",
    content: "Looking at your traffic data, I see a 23% increase in organic visits. Your top-performing page is the product landing page. I recommend adding more CTAs above the fold and improving meta descriptions for pages 3-5 in your sitemap.",
    timestamp: "10:32 AM",
  },
];

/* ── Simple Chart Component ────────────────────────────────────────── */

function TrafficChart({ auditHistory }: { auditHistory: any[] }) {
  if (!auditHistory || auditHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl space-y-2">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
        <span>No data yet</span>
        <span className="text-xs text-muted-foreground/60">Run an audit to see your activity</span>
      </div>
    );
  }

  const auditData = auditHistory.slice(0, 14).reverse();
  const data = auditData.map((a: any) => a.score || a.totalScore || 0);
  if (data.length === 0 || data.every((v: number) => v === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl">
        Run audits to see your activity
      </div>
    );
  }

  const max = Math.max(...data);
  const points = data.map((v: number, i: number) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
    const y = 100 - (v / max) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative w-full h-48">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#chartGradient)" />
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((v: number, i: number) => {
          const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
          const y = 100 - (v / max) * 80 - 10;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.2"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="0.4"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-muted-foreground">
        {auditData.map((a: any, i: number) => {
          const label = a.created_at
            ? new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : String(i + 1);
          return <span key={i}>{label}</span>;
        })}
      </div>
    </div>
  );
}

/* ── Audit Summary Component ───────────────────────────────────────── */

function AuditSummary({ auditHistory }: { auditHistory: any[] }) {
  if (!auditHistory || auditHistory.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center space-y-2">
        <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">No data yet</p>
        <p className="text-xs text-muted-foreground/60">Run your first audit to see summary stats.</p>
      </div>
    );
  }

  const totalAudits = auditHistory.length;
  const avgScore = Math.round(
    auditHistory.reduce((sum, a) => sum + (a.score || a.totalScore || 0), 0) / totalAudits
  );
  const latestScore = auditHistory[0]?.score || auditHistory[0]?.totalScore || 0;

  const steps = [
    { label: "Total Audits", value: totalAudits, icon: <BarChart3 className="w-4 h-4" />, color: "bg-primary/20 text-primary" },
    { label: "Avg Score", value: avgScore, icon: <TrendingUp className="w-4 h-4" />, color: "bg-purple-500/20 text-purple-400" },
    { label: "Latest Score", value: latestScore, icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-emerald-500/20 text-emerald-400" },
  ];

  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className={cn(
              "flex-1 rounded-xl border border-border/50 p-4 flex items-center gap-3",
              "bg-card/60 backdrop-blur-sm"
            )}
          >
            <div className={cn("p-2.5 rounded-lg", step.color)}>{step.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{step.label}</p>
              <p className="text-lg font-semibold">{step.value}</p>
            </div>
          </motion.div>
          {i < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("traffic");
  const [period, setPeriod] = useState<"7" | "30">("7");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [userLabel, setUserLabel] = useState("VS");
  const [isAdmin, setIsAdmin] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { ref: headerRef, isInView: headerVisible } = useInView(0.1);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = String(payload.email || '');
      setUserLabel(email ? email.slice(0, 2).toUpperCase() : 'VS');
      setIsAdmin(payload.role === 'admin');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') !== 'true') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.token) localStorage.setItem('token', data.token);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE}/api/quota`, { headers: authHeaders() }).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/audit/history`, { headers: authHeaders() }).then((r) => r.json()).catch(() => []),
    ]).then(([quotaData, historyData]) => {
      if (quotaData) setQuota(quotaData);
      if (Array.isArray(historyData)) setAuditHistory(historyData);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const lastAudit = auditHistory[0];
    let reply: string;
    if (!lastAudit) {
      reply = "Welcome to ValueScan! I don't see any audits in your history yet. Run your first SEO audit to get personalized recommendations and actionable insights tailored to your site.";
    } else if (Array.isArray(lastAudit.recommendations) && lastAudit.recommendations.length > 0) {
      const recs = lastAudit.recommendations.slice(0, 3).join(' ');
      reply = `Based on your latest audit, here are the key recommendations: ${recs} Let me know if you'd like me to go deeper on any of these.`;
    } else {
      reply = "I've reviewed your latest audit. Your site is looking solid! Let me know if you'd like me to dive deeper into any specific area or compare with previous audits.";
    }

    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: "user", content: chatInput, timestamp: time },
      { id: String(Date.now() + 1), role: "assistant", content: reply, timestamp: time },
    ]);
    setChatInput("");
  };

  const statusIcon = (status: AgentItem["status"]) => {
    switch (status) {
      case "active":
        return <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />;
      case "idle":
        return <div className="w-2 h-2 rounded-full bg-amber-400" />;
      case "paused":
        return <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />;
    }
  };

  const statusLabel = (status: AgentItem["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "idle":
        return "Idle";
      case "paused":
        return "Paused";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Dashboard — ValueScan" description="Your ValueScan audit dashboard." />
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">ValueScan</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/audits" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
              Audits
            </Link>
            {isAdmin && (
              <Link to="/admin" className="hidden sm:inline text-sm text-amber-500 hover:text-amber-400 transition-colors">
                Admin
              </Link>
            )}
            <NotificationBell />
            <Link to="/profile" className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary hover:bg-primary/30 transition-colors">
              {userLabel}
            </Link>
          </div>
        </div>
      </header>
      <Breadcrumb />

      {/* Main Layout */}
      <div className="flex">
        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-border/50 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Company Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <ScanLine className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">ValueScan</h3>
                  <p className="text-xs text-muted-foreground">valuescan.online</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                  SEO Audits
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium border border-border/50">
                  Security
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated website audits for SEO, SEM, security, and performance — with actionable fix recommendations.
              </p>
            </motion.div>

            {/* Documents Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Documents
                </span>
                <button className="p-1 rounded hover:bg-secondary/80 transition-colors">
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                <Link to={auditHistory[0]?.id ? `/audits/${auditHistory[0].id}` : "/audits"} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Latest Audit Report</span>
                </Link>
                <Link to="/audits" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <History className="w-4 h-4" />
                  <span>Audit History</span>
                </Link>
                <Link to="/docs" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>Documentation</span>
                </Link>
              </div>
            </motion.div>

            {/* Tools Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Tools
                </span>
              </div>
              <div className="space-y-1">
                <Link to="/tools/keywords" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <Key className="w-4 h-4" />
                  <span>Keyword Research</span>
                </Link>
                <Link to="/tools/rank-tracker" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <Target className="w-4 h-4" />
                  <span>Rank Tracker</span>
                </Link>
                <Link to="/tools/backlinks" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <LinkIcon className="w-4 h-4" />
                  <span>Backlinks</span>
                </Link>
                <Link to="/tools/ai-visibility" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <Eye className="w-4 h-4" />
                  <span>AI Visibility</span>
                </Link>
                <Link to="/tools/content-gap" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <Compass className="w-4 h-4" />
                  <span>Content Gap</span>
                </Link>
                <Link to="/tools/local-seo" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <MapPin className="w-4 h-4" />
                  <span>Local SEO</span>
                </Link>
                <Link to="/tools/competitors" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <Globe className="w-4 h-4" />
                  <span>Competitors</span>
                </Link>
                <Link to="/audits" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <History className="w-4 h-4" />
                  <span>Audit History</span>
                </Link>
                <Link to="/alerts" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <Bell className="w-4 h-4" />
                  <span>Change Alerts</span>
                </Link>
                <Link to="/bulk-audit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>Bulk Audit</span>
                </Link>
                <Link to="/compare" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  <span>Compare</span>
                </Link>
              </div>
            </motion.div>

            {/* Quota Section */}
            <QuotaCard quota={quota} />
          </div>
        </aside>

        {/* ── Center Content ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="flex">
            <div className="flex-1 min-w-0 p-4 lg:p-6 space-y-6">
              {/* Analytics Header */}
              <motion.div
                ref={headerRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: headerVisible ? 1 : 0, y: headerVisible ? 0 : 10 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h1 className="text-xl font-bold">Analytics</h1>
                  <p className="text-sm text-muted-foreground">Track your website performance and growth</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 p-1 rounded-lg bg-card border border-border/50">
                    <button
                      onClick={() => setPeriod("7")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        period === "7"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => setPeriod("30")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        period === "30"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Last 30 days
                    </button>
                  </div>
                  <Link
                    to="/audit"
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                  >
                    Quick Scan
                  </Link>
                </div>
              </motion.div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-border/50 pb-0 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                      activeTab === tab.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {activeTab === "traffic" && (
                    <>
                      {/* Audit Summary */}
                      <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Audit Summary
                        </h2>
                        <AuditSummary auditHistory={auditHistory} />
                      </div>

                      {/* Traffic Chart */}
                      <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">Audit Activity</h3>
                            <p className="text-xs text-muted-foreground">Scores over time</p>
                          </div>
                          {auditHistory.length > 1 && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span className="font-medium">{auditHistory.length} audits</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <TrafficChart auditHistory={auditHistory} />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {(() => {
                          const totalAudits = auditHistory.length;
                          const avgScore = totalAudits > 0
                            ? Math.round(auditHistory.reduce((sum, a) => sum + (a.score || a.totalScore || 0), 0) / totalAudits)
                            : 0;
                          const latestScore = totalAudits > 0 ? (auditHistory[0]?.score || auditHistory[0]?.totalScore || 0) : 0;
                          const auditUsed = quota?.used?.audits || 0;
                          const auditLimit = quota?.limits?.audits;

                          const stats = [
                            { label: "Total Audits", value: String(totalAudits), change: totalAudits > 0 ? "completed" : "", positive: true },
                            { label: "Avg Score", value: totalAudits > 0 ? String(avgScore) : "-", change: totalAudits > 0 ? "out of 100" : "", positive: avgScore >= 70 },
                            { label: "Latest Score", value: totalAudits > 0 ? String(latestScore) : "-", change: totalAudits > 1 ? "most recent" : "", positive: latestScore >= 70 },
                            { label: "Audits Used", value: String(auditUsed), change: auditLimit > 0 ? `of ${auditLimit}` : 'unlimited', positive: true },
                          ];

                          return stats.map((stat) => (
                            <motion.div
                              key={stat.label}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="rounded-xl border border-border/50 bg-card/50 p-4"
                            >
                              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                              <p className="text-xl font-bold">{stat.value}</p>
                              {stat.change && (
                                <p className={cn("text-xs font-medium mt-1", stat.positive ? "text-emerald-400" : "text-red-400")}>
                                  {stat.change}
                                </p>
                              )}
                            </motion.div>
                          ));
                        })()}
                      </div>

                      {/* Recent Audits */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Recent Audits
                          </h2>
                          <Link to="/audits" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            View All →
                          </Link>
                        </div>
                        {auditHistory.length === 0 ? (
                          <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center text-sm text-muted-foreground">
                            No recent audits.
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-secondary/40 border-b border-border/50">
                                <tr>
                                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">URL</th>
                                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
                                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {auditHistory.slice(0, 5).map((a: any) => (
                                  <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                                    <td className="px-4 py-3 truncate max-w-[200px]" title={a.url}>{a.url}</td>
                                    <td className="px-4 py-3 text-right font-medium">{a.score || a.totalScore || 0}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">
                                      {a.created_at ? new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {activeTab === "seo" && (
                    <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center space-y-3">
                      <Search className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                      <h3 className="font-semibold">SEO Overview</h3>
                      <p className="text-sm text-muted-foreground">Keyword rankings, backlink profile, and site health metrics.</p>
                    </div>
                  )}

                  {activeTab === "links" && (
                    <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center space-y-3">
                      <LinkIcon className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                      <h3 className="font-semibold">Link Analysis</h3>
                      <p className="text-sm text-muted-foreground">Backlink discovery, anchor text distribution, and link quality scoring.</p>
                    </div>
                  )}

                  {activeTab === "technical" && (
                    <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center space-y-3">
                      <Settings className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                      <h3 className="font-semibold">Technical Audit</h3>
                      <p className="text-sm text-muted-foreground">Core Web Vitals, crawl errors, and indexing status.</p>
                    </div>
                  )}

                  {activeTab === "geo" && (
                    <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center space-y-3">
                      <MapPin className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                      <h3 className="font-semibold">Geographic Data</h3>
                      <p className="text-sm text-muted-foreground">Visitor distribution by country, region, and city.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Agents Feed (Center-Right) ─────────────────────────── */}
            <div className="hidden xl:block w-72 shrink-0 border-l border-border/50 p-4 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-xl border border-border/50 bg-card/50 p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    Agents Feed
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    5 Active
                  </span>
                </div>
                <div className="space-y-1">
                  {AGENTS.map((agent, i) => (
                    <motion.button
                      key={agent.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors group text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        {agent.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(agent.status)}
                          <span className="text-[10px] text-muted-foreground">{statusLabel(agent.status)}</span>
                        </div>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Quick Tasks */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="rounded-xl border border-border/50 bg-card/50 p-4"
              >
                <h3 className="font-semibold text-sm mb-3">Quick Tasks</h3>
                <div className="space-y-2">
                  {[
                    { label: "Run SEO audit", done: true },
                    { label: "Generate content brief", done: false },
                    { label: "Analyze competitors", done: false },
                    { label: "Schedule social posts", done: true },
                  ].map((task) => (
                    <div key={task.label} className="flex items-center gap-2.5 text-sm">
                      {task.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={cn(task.done && "text-muted-foreground line-through")}>{task.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </main>

        {/* ── Right Sidebar (Chat / CMO) ─────────────────────────────── */}
        <aside className="hidden lg:block w-80 shrink-0 border-l border-border/50 h-[calc(100vh-3.5rem)] sticky top-14 flex flex-col">
          {/* CMO Widget */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="m-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Hire your full-time CMO</h3>
                <p className="text-xs text-muted-foreground">AI-powered marketing leadership</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">$99<span className="text-sm font-normal text-muted-foreground">/month</span></div>
              <Link
                to="/pricing"
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Upgrade
              </Link>
            </div>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex-1 flex flex-col mx-4 mb-4 rounded-xl border border-border/50 bg-card/50 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">AI CMO</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </p>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-secondary/80 text-foreground rounded-bl-none border border-border/30"
                    )}
                  >
                    {msg.content}
                    <div className={cn("text-[10px] mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                      {msg.timestamp}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-medium">JD</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask your AI CMO..."
                    className="w-full rounded-lg bg-secondary/60 border border-border/50 px-3 py-2 pr-8 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  <button
                    onClick={handleSend}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors" title="Expand">
                    <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors" title="Voice">
                    <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors" title="History">
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Pro plan</span>
                </div>
              </div>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}

/* ── Quota Card Component ─────────────────────────────────────────── */

function QuotaCard({ quota: propQuota }: { quota?: any }) {
  const [quota, setQuota] = useState<any>(propQuota || null);
  const [loading, setLoading] = useState(!propQuota);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (propQuota) { setQuota(propQuota); setLoading(false); return; }
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/quota`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { setQuota(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, propQuota]);

  if (loading) return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
        <div className="h-4 w-14 bg-muted-foreground/20 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted-foreground/20 rounded" />
        <div className="h-2 w-full bg-muted-foreground/20 rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-12 bg-muted-foreground/20 rounded-full" />
        <div className="h-4 w-16 bg-muted-foreground/20 rounded-full" />
      </div>
    </div>
  );
  if (!quota) return null;

  const planLabel = { free: 'Free', pro: 'Pro', max: 'Max' }[String(quota.plan).toLowerCase()] || 'Free';
  const auditLimit = quota.limits?.audits;
  const auditUsed = quota.used?.audits || 0;
  const auditPct = auditLimit > 0 ? Math.round((auditUsed / auditLimit) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-border/50 bg-card/50 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Usage</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-medium",
          quota.plan === 'max' ? 'bg-amber-500/10 text-amber-500' : quota.plan === 'pro' ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-500/10 text-slate-500'
        )}>
          {planLabel}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Audits Today</span>
            <span className="font-medium">{auditUsed}{auditLimit > 0 ? ` / ${auditLimit}` : ' / ∞'}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", auditPct >= 90 ? 'bg-red-500' : auditPct >= 70 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${auditLimit > 0 ? auditPct : 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(quota.features || {}).map(([key, enabled]) => (
            enabled ? (
              <span key={key} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            ) : null
          ))}
        </div>
      </div>
    </motion.div>
  );
}
