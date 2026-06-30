import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Send, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE, authHeaders } from '../../lib/api';
import MetaTags from '../layout/MetaTags';

interface Ticket {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!subject.trim() || !message.trim()) { setError('Subject and message required'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, category }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Ticket created successfully');
        setSubject('');
        setMessage('');
        setShowForm(false);
        loadTickets();
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'open': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Support — ValueScan" description="Create a support ticket." />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Support</h1>
              <p className="text-muted-foreground">Create a support ticket and we'll get back to you.</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> New Ticket
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={submitTicket}
                className="bg-card border border-border/50 rounded-xl p-6 mb-6 overflow-hidden"
              >
                <h2 className="text-lg font-semibold mb-4">Create Ticket</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's the issue?" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all">
                      <option value="general">General</option>
                      <option value="billing">Billing</option>
                      <option value="technical">Technical</option>
                      <option value="feature">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Describe your issue in detail..." className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none" required />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {success && <p className="text-sm text-green-500">{success}</p>}
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Ticket
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border/50 rounded-xl">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No tickets yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create a ticket if you need help</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div key={ticket.id} className="bg-card border border-border/50 rounded-xl p-4 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusIcon(ticket.status)}
                        <span className="text-sm font-medium">{ticket.subject}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{ticket.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{ticket.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{new Date(ticket.created_at).toLocaleDateString('en-GB')} · {ticket.category}</p>
                    </div>
                  </div>
                  {ticket.admin_reply && (
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">Reply from support:</p>
                      <p className="text-sm">{ticket.admin_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
