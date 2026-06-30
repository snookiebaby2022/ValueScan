import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScanLine, Sun, Moon, Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import cn from '../../lib/utils';
import ToolsMegaMenu from './ToolsMegaMenu';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Skills', to: '/skills' },
  { label: 'Tools', mega: true },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Blog', to: '/blog' },
  { label: 'Docs', to: '/docs' },
  { label: 'Contact', to: '/contact' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTools = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setToolsOpen(true);
  };

  const closeTools = () => {
    closeTimer.current = setTimeout(() => setToolsOpen(false), 300);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsAdmin(payload.role === 'admin');
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };
    checkAuth();
    // Sync auth state across tabs
    window.addEventListener('storage', checkAuth);
    // Re-check on window focus (in case token was removed in another tab)
    window.addEventListener('focus', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('focus', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsAdmin(false);
    window.location.href = '/';
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ValueScan</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => {
              if (link.mega) {
                return (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={openTools}
                    onMouseLeave={closeTools}
                  >
                    <button
                      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 flex items-center gap-1"
                      aria-expanded={toolsOpen}
                      aria-haspopup="true"
                      aria-label="Tools menu"
                    >
                      {link.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {toolsOpen && <ToolsMegaMenu onMouseEnter={openTools} onMouseLeave={closeTools} />}
                  </div>
                );
              }
              return link.to ? (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                  aria-label={link.label}
                  aria-current={location.pathname === link.to ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                  aria-label={link.label}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors"
                aria-label="Admin panel"
              >
                Admin
              </Link>
            )}
            {isLoggedIn ? (
              <div className="relative"
                onMouseEnter={() => {
                  if (userMenuCloseTimer.current) {
                    window.clearTimeout(userMenuCloseTimer.current);
                    userMenuCloseTimer.current = null;
                  }
                  setUserMenuOpen(true);
                }}
                onMouseLeave={() => {
                  userMenuCloseTimer.current = window.setTimeout(() => setUserMenuOpen(false), 200);
                }}
              >
                <button className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                  aria-label="Account menu"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true">
                  <User className="w-4 h-4" /> Account
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 rounded-xl bg-card border border-border shadow-xl shadow-black/10 py-1 z-50">
                    <Link to="/dashboard" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Dashboard</Link>
                    <Link to="/audits" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Audit History</Link>
                    <Link to="/max" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Max Features</Link>
                    <Link to="/alerts" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Change Alerts</Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Profile Settings</Link>
                    <div className="border-t border-border my-1" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                aria-label="Sign in"
              >
                Sign In
              </Link>
            )}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted/50"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              if (link.mega) {
                return (
                  <ToolsMegaMenu
                    key={link.label}
                    variant="mobile"
                    onNavigate={() => setMobileOpen(false)}
                  />
                );
              }
              return link.to ? (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
                  aria-label={link.label}
                  aria-current={location.pathname === link.to ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
                  aria-label={link.label}
                >
                  {link.label}
                </a>
              );
            })}
            {isLoggedIn && (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50" aria-label="Dashboard">Dashboard</Link>
                <Link to="/audits" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50" aria-label="Audit History">Audit History</Link>
                <Link to="/alerts" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50" aria-label="Change Alerts">Change Alerts</Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50" aria-label="Profile">Profile</Link>
              </>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 rounded-lg hover:bg-amber-500/10"
                aria-label="Admin Panel"
              >
                Admin Panel
              </Link>
            )}
            {isLoggedIn ? (
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium text-red-500 hover:text-red-400 rounded-lg hover:bg-red-500/10" aria-label="Sign Out">
                Sign Out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50" aria-label="Sign In">Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
