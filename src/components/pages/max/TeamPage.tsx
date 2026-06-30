import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Trash2, Loader2, UserPlus } from 'lucide-react';
import { API_BASE, authHeaders } from '../../../lib/api';

type Member = {
  id: number;
  member_email: string;
  member_name?: string;
  status: string;
  created_at: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    fetch(`${API_BASE}/api/max/team`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.members)) setMembers(d.members); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setInviteUrl('');
    try {
      const res = await fetch(`${API_BASE}/api/max/team/invite`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.invite?.acceptUrl) {
        setInviteUrl(`${window.location.origin}${data.invite.acceptUrl}`);
        setEmail('');
        load();
      } else setError(data.error || 'Failed to invite');
    } catch {
      setError('Network error');
    }
    setInviting(false);
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this team member?')) return;
    await fetch(`${API_BASE}/api/max/team/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-2"><Users className="w-6 h-6 text-primary" /> Team</h1>
      <p className="text-sm text-muted-foreground mb-6">Invite colleagues to share audits and dashboards on your Max account.</p>

      <form onSubmit={invite} className="flex gap-2 mb-6 max-w-lg">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:border-primary/50"
            required
          />
        </div>
        <button type="submit" disabled={inviting} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60">
          {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Invite
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      {inviteUrl && (
        <div className="mb-6 p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-sm">
          <p className="font-medium mb-1">Invite link created — share with your teammate:</p>
          <code className="text-xs break-all">{inviteUrl}</code>
        </div>
      )}

      <div className="space-y-2">
        {members.filter((m) => m.status !== 'removed').map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div>
              <p className="font-medium">{m.member_name || m.member_email}</p>
              <p className="text-xs text-muted-foreground">{m.member_email} · {m.status}</p>
            </div>
            <button onClick={() => remove(m.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-muted-foreground">No team members yet</p>}
      </div>
    </motion.div>
  );
}
