import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Building2, Globe, Shield, AlertTriangle, Check, Loader2,
  CreditCard, Crown, Zap, Trash2, X
} from 'lucide-react';
import { API_BASE, authHeaders } from '../../lib/api';
import MetaTags from '../layout/MetaTags';
import Breadcrumb from '../layout/Breadcrumb';

interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  company: string | null;
  timezone: string | null;
  email_verified: number;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [nameError, setNameError] = useState('');
  const [pwFieldErrors, setPwFieldErrors] = useState({ current: '', new: '', confirm: '' });

  const [form, setForm] = useState({ name: '', company: '', timezone: '' });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setUser(data);
        setForm({ name: data.name || '', company: data.company || '', timezone: data.timezone || 'UTC' });
        setLoading(false);
      })
      .catch(() => { setError('Failed to load profile'); setLoading(false); });
  }, [token, navigate]);

  const handleSave = async () => {
    setSaving(true); setMessage(''); setError(''); setNameError('');

    if (!form.name.trim()) {
      setNameError('Name is required');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) { setMessage('Profile updated successfully'); setUser(prev => prev ? { ...prev, ...form } : null); }
      else setError(data.error || 'Update failed');
    } catch { setError('Network error'); }
    setSaving(false);
  };

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalMessage, setPortalMessage] = useState('');

  const handlePortal = async () => {
    setPortalLoading(true);
    setPortalMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-portal`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPortalMessage(data.error || 'Failed to open billing portal');
    } catch { setPortalMessage('Network error'); }
    setPortalLoading(false);
  };
  const handlePasswordChange = async () => {
    setPwFieldErrors({ current: '', new: '', confirm: '' });
    setPwError(''); setPwMessage('');

    let valid = true;
    const errors = { current: '', new: '', confirm: '' };
    if (!pwForm.current) { errors.current = 'Current password is required'; valid = false; }
    if (!pwForm.new) { errors.new = 'New password is required'; valid = false; }
    else if (pwForm.new.length < 8) { errors.new = 'Password must be at least 8 characters'; valid = false; }
    if (!pwForm.confirm) { errors.confirm = 'Please confirm your password'; valid = false; }
    else if (pwForm.new !== pwForm.confirm) { errors.confirm = 'Passwords do not match'; valid = false; }
    if (!valid) { setPwFieldErrors(errors); return; }

    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.new })
      });
      const data = await res.json();
      if (data.success) { setPwMessage('Password updated successfully'); setPwForm({ current: '', new: '', confirm: '' }); }
      else setPwError(data.error || 'Password update failed');
    } catch { setPwError('Network error'); }
    setPwSaving(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/account`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        localStorage.removeItem('token');
        navigate('/');
      } else {
        setError('Failed to delete account');
      }
    } catch {
      setError('Network error');
    }
    setDeleting(false);
    setShowDeleteModal(false);
  };

  const planLabel = { free: 'Free', pro: 'Pro', max: 'Max' }[user?.plan || 'free'];
  const planColor = { free: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', max: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }[user?.plan || 'free'];

  const timezones = ['UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'];

  const inputBase = "w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none transition-colors focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500";
  const inputError = "border-red-500";
  const inputNormal = "border-slate-200 dark:border-slate-600";

  const getInputClass = (hasError: boolean) => `${inputBase} ${hasError ? inputError : inputNormal}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Profile — ValueScan" description="Manage your account settings." />
      <Breadcrumb />
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-[calc(100vh-4rem)] sticky top-16">
          <div className="p-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
          <nav className="px-4 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
              <User className="w-4 h-4" /> Profile
            </button>
            <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Zap className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => navigate('/audits')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Shield className="w-4 h-4" /> Audit History
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-5xl">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Account Settings</h1>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
          ) : (
            <div className="space-y-6">
              {/* Profile Info */}
              <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-purple-500" /> Profile Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input id="profile-name" type="text" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                        className={getInputClass(!!nameError)}
                        aria-invalid={!!nameError}
                        aria-describedby={nameError ? 'profile-name-error' : undefined} />
                    </div>
                    {nameError && <p id="profile-name-error" className="text-sm text-red-500 mt-1.5">{nameError}</p>}
                  </div>
                  <div>
                    <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input id="profile-email" type="email" value={user?.email || ''} disabled
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="profile-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input id="profile-company" type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                        className={getInputClass(false)} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="profile-timezone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <select id="profile-timezone" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                        className={getInputClass(false)}>
                        {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                {message && <p className="mt-4 flex items-center gap-2 text-sm text-green-600"><Check className="w-4 h-4" /> {message}</p>}
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                <button onClick={handleSave} disabled={saving}
                  className="mt-4 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                </button>
              </section>

              {/* Plan Info */}
              <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-purple-500" /> Subscription
                </h2>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${planColor}`}>
                      <Crown className="w-3.5 h-3.5 mr-1.5" /> {planLabel} Plan
                    </span>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                    {user?.email_verified === 0 && (
                      <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Email not verified. <button onClick={() => navigate('/verify-email')} className="underline hover:text-amber-700 transition-colors">Verify now</button>
                      </p>
                    )}
                  </div>
                  {user?.plan !== 'free' && (
                    <button onClick={handlePortal} disabled={portalLoading}
                      className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Manage Subscription
                    </button>
                  )}
                  {user?.plan === 'free' && (
                    <button onClick={() => navigate('/pricing')} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                      Upgrade Plan
                    </button>
                  )}
                </div>
                {portalMessage && <p className="mt-3 text-sm text-red-600">{portalMessage}</p>}
              </section>

              {/* Email Delivery */}
              <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-purple-500" /> Email Delivery
                </h2>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Verification, password reset, and alert emails are sent via your configured SMTP server.
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      To configure: set SMTP_HOST, SMTP_USER, SMTP_PASS, and FROM_EMAIL in your server .env file.
                    </p>
                  </div>
                  <a href="mailto:hello@valuescan.online" className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Contact Support
                  </a>
                </div>
              </section>

              {/* Security */}
              <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-purple-500" /> Security
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="pw-current" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                    <input id="pw-current" type="password" value={pwForm.current} onChange={e => { setPwForm(f => ({ ...f, current: e.target.value })); setPwFieldErrors(err => ({ ...err, current: '' })); }}
                      className={getInputClass(!!pwFieldErrors.current)}
                      aria-invalid={!!pwFieldErrors.current}
                      aria-describedby={pwFieldErrors.current ? 'pw-current-error' : undefined} />
                    {pwFieldErrors.current && <p id="pw-current-error" className="text-sm text-red-500 mt-1.5">{pwFieldErrors.current}</p>}
                  </div>
                  <div>
                    <label htmlFor="pw-new" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <input id="pw-new" type="password" value={pwForm.new} onChange={e => { setPwForm(f => ({ ...f, new: e.target.value })); setPwFieldErrors(err => ({ ...err, new: '' })); }}
                      className={getInputClass(!!pwFieldErrors.new)}
                      aria-invalid={!!pwFieldErrors.new}
                      aria-describedby={pwFieldErrors.new ? 'pw-new-error' : undefined} />
                    {pwFieldErrors.new && <p id="pw-new-error" className="text-sm text-red-500 mt-1.5">{pwFieldErrors.new}</p>}
                  </div>
                  <div>
                    <label htmlFor="pw-confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                    <input id="pw-confirm" type="password" value={pwForm.confirm} onChange={e => { setPwForm(f => ({ ...f, confirm: e.target.value })); setPwFieldErrors(err => ({ ...err, confirm: '' })); }}
                      className={getInputClass(!!pwFieldErrors.confirm)}
                      aria-invalid={!!pwFieldErrors.confirm}
                      aria-describedby={pwFieldErrors.confirm ? 'pw-confirm-error' : undefined} />
                    {pwFieldErrors.confirm && <p id="pw-confirm-error" className="text-sm text-red-500 mt-1.5">{pwFieldErrors.confirm}</p>}
                  </div>
                </div>
                {pwMessage && <p className="mt-4 flex items-center gap-2 text-sm text-green-600"><Check className="w-4 h-4" /> {pwMessage}</p>}
                {pwError && <p className="mt-4 text-sm text-red-600">{pwError}</p>}
                <button onClick={handlePasswordChange} disabled={pwSaving}
                  className="mt-4 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Update Password
                </button>
              </section>

              {/* Danger Zone */}
              <section className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5" /> Danger Zone
                </h2>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Delete Account</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">This will permanently delete all your data.</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-6 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Delete Account
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              All your data, audits, and settings will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
