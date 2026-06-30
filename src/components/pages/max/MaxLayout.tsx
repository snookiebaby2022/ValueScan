import { Link, Outlet, useLocation } from 'react-router-dom';
import { Key, Users, Palette, Webhook } from 'lucide-react';
import cn from '../../../lib/utils';

const NAV = [
  { to: '/max/api-keys', label: 'API Keys', icon: Key },
  { to: '/max/team', label: 'Team', icon: Users },
  { to: '/max/branding', label: 'White-label', icon: Palette },
  { to: '/max/webhooks', label: 'Webhooks', icon: Webhook },
];

export default function MaxLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-52 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">Max features</p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.to
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
