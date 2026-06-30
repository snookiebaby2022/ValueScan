import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Webhook, Plus, Trash2, Loader2, Zap } from 'lucide-react';
import { API_BASE, authHeaders } from '../../../lib/api';

type Hook = { id: number; url: string; events: string; active: number; created_at: string };
type Delivery = { id: number; event: string; success: number; error?: string; url: string; created_at: string };

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Hook[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('audit.completed');
  const [newSecret, setNewSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => {
    fetch(`${API_BASE}/api/max/webhooks`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.webhooks)) setWebhooks(d.webhooks);
        if (Array.isArray(d.deliveries)) setDeliveries(d.deliveries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/max/webhooks`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events }),
      });
      const data = await res.json();
      if (data.webhook?.secret) {
        setNewSecret(data.webhook.secret);
        setUrl('');
        load();
      }
    } catch { /* ignore */ }
    setAdding(false);
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`${API_BASE}/api/max/webhooks/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const test = async (id: number) => {
    await fetch(`${API_BASE}/api/max/webhooks/${id}/test`, { method: 'POST', headers: authHeaders() });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-2"><Webhook className="w-6 h-6 text-primary" /> Webhooks</h1>
      <p className="text-sm text-muted-foreground mb-6">Receive HTTP POST notifications when audits complete. Verify with <code className="text-xs bg-muted px-1 rounded">X-ValueScan-Signature</code>.</p>

      <form onSubmit={add} className="space-y-3 mb-6 max-w-xl">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-server.com/webhooks/valuescan"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:border-primary/50"
          required
        />
        <select
          value={events}
          onChange={(e) => setEvents(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm outline-none"
        >
          <option value="audit.completed">audit.completed</option>
          <option value="*">All events (*)</option>
        </select>
        <button type="submit" disabled={adding} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add webhook
        </button>
      </form>

      {newSecret && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm">
          <p className="font-medium mb-1">Signing secret (save this):</p>
          <code className="text-xs break-all">{newSecret}</code>
        </div>
      )}

      <div className="space-y-2 mb-8">
        {webhooks.map((h) => (
          <div key={h.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{h.url}</p>
              <p className="text-xs text-muted-foreground">{h.events} · {h.created_at?.split('T')[0]}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => test(h.id)} className="p-2 text-primary hover:bg-primary/10 rounded-lg" title="Send test"><Zap className="w-4 h-4" /></button>
              <button onClick={() => remove(h.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && <p className="text-sm text-muted-foreground">No webhooks configured</p>}
      </div>

      {deliveries.length > 0 && (
        <>
          <h2 className="font-semibold mb-3 text-sm">Recent deliveries</h2>
          <div className="rounded-xl border border-border overflow-hidden text-sm">
            {deliveries.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0">
                <span className="truncate text-muted-foreground">{d.event} → {d.url}</span>
                <span className={d.success ? 'text-green-500' : 'text-red-500'}>{d.success ? 'OK' : 'Failed'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
