import { Link } from 'react-router-dom';
import { Search, ArrowLeft, Home, AlertTriangle } from 'lucide-react';
import MetaTags from '../layout/MetaTags';

export default function NotFound() {
  return (

    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="404 — ValueScan" description="Page not found." />
      <div className="pt-16 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <p className="text-xl font-semibold text-foreground mb-2">Page not found</p>
          <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity">
              <Home className="w-4 h-4" /> Go Home
            </Link>
            <Link to="/dashboard" className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl font-medium hover:bg-secondary/60 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          </div>
          <div className="mt-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <Search className="w-4 h-4" /> Try searching
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
