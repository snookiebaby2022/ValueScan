import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { API_BASE, authHeaders } from '../../../lib/api';

type ApiKeyRow = {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at?: string;
  created_at: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`${API_BASE}/api/max/api-keys`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.keys)) setKeys(d.keys); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/max/api-keys`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Production' }),
      });
      const data = await res.json();
      if (data.key?.key) {
        setNewKey(data.key.key);
        load();
      } else setError(data.error || 'Failed to create key');
    } catch {
      setError('Network error');
    }
    setCreating(false);
  };

  const revoke = async (id: number) => {
    if (!confirm('Revoke this API key?')) return;
    await fetch(`${API_BASE}/api/max/api-keys/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="w-6 h-6 text-primary" /> API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">Use keys with the ValueScan REST API. Pass via <code className="text-xs bg-muted px-1 rounded">X-API-Key</code> header.</p>
        </div>
        <button onClick={createKey} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New key
        </button>
      </div>

      {newKey && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-medium mb-2">Copy your new API key — it won&apos;t be shown again</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 overflow-x-auto">{newKey}</code>
            <button onClick={copyKey} className="px-3 py-2 rounded-lg border border-border hover:bg-muted/50">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prefix</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last used</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}…</td>
                <td className="px-4 py-3 text-muted-foreground">{k.last_used_at?.split('T')[0] || 'Never'}</td>
                <td className="px-4 py-3 text-muted-foreground">{k.created_at?.split('T')[0]}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => revoke(k.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No API keys yet</p>}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border text-sm">
        <p className="font-medium mb-2">Example request</p>
        <pre className="text-xs overflow-x-auto text-muted-foreground">{`curl -H "X-API-Key: vs_live_..." \\
  "https://valuescan.online/api/v1/audit?url=https://example.com"`}</pre>
      </div>
    </motion.div>
  );
}
