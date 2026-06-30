import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Loader2, Save } from 'lucide-react';
import { API_BASE, authHeaders } from '../../../lib/api';

type Branding = {
  company_name: string;
  logo_url: string;
  accent_color: string;
  hide_valuescan: number;
  report_footer: string;
};

export default function BrandingPage() {
  const [form, setForm] = useState<Branding>({
    company_name: '',
    logo_url: '',
    accent_color: '#7c3aed',
    hide_valuescan: 0,
    report_footer: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/max/branding`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.branding) setForm(d.branding);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/max/branding`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.company_name,
          logoUrl: form.logo_url,
          accentColor: form.accent_color,
          hideValueScan: !!form.hide_valuescan,
          reportFooter: form.report_footer,
        }),
      });
      const data = await res.json();
      if (data.branding) {
        setForm(data.branding);
        setMessage('Branding saved');
      }
    } catch {
      setMessage('Failed to save');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-2"><Palette className="w-6 h-6 text-primary" /> White-label branding</h1>
      <p className="text-sm text-muted-foreground mb-6">Customise PDF exports and client-facing reports with your agency brand.</p>

      <form onSubmit={save} className="max-w-lg space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Company name</label>
          <input
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:border-primary/50"
            placeholder="Your Agency Ltd"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Logo URL</label>
          <input
            value={form.logo_url}
            onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:border-primary/50"
            placeholder="https://yoursite.com/logo.png"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Accent colour</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
              className="w-12 h-10 rounded border border-border cursor-pointer"
            />
            <input
              value={form.accent_color}
              onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
              className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-card text-sm font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Report footer text</label>
          <textarea
            value={form.report_footer}
            onChange={(e) => setForm((f) => ({ ...f, report_footer: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:border-primary/50 resize-none"
            placeholder="Prepared by Your Agency — confidential"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.hide_valuescan}
            onChange={(e) => setForm((f) => ({ ...f, hide_valuescan: e.target.checked ? 1 : 0 }))}
            className="rounded border-border"
          />
          Hide ValueScan branding on exports
        </label>

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save branding
        </button>
        {message && <p className="text-sm text-green-500">{message}</p>}
      </form>

      <div className="mt-8 p-6 rounded-xl border border-border" style={{ borderColor: form.accent_color }}>
        <div className="flex items-center gap-3 mb-3">
          {form.logo_url ? <img src={form.logo_url} alt="" className="h-8 object-contain" /> : <div className="w-8 h-8 rounded bg-muted" />}
          <span className="font-bold" style={{ color: form.accent_color }}>{form.company_name || 'Your Company'}</span>
        </div>
        <p className="text-xs text-muted-foreground">Preview of report header</p>
        {form.report_footer && <p className="text-xs mt-4 pt-4 border-t border-border text-muted-foreground">{form.report_footer}</p>}
      </div>
    </motion.div>
  );
}
