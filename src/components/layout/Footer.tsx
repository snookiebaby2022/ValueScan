import { Link } from 'react-router-dom';
import { ScanLine, Twitter, Linkedin, Github, Youtube, Shield, FileText, Cookie } from 'lucide-react';

const footerLinks: Record<string, { label: string; to: string }[]> = {
  Product: [
    { label: 'Features', to: '/#features' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'API Docs', to: '/docs' },
    { label: 'Changelog', to: '/blog' },
    { label: 'Roadmap', to: '/blog' },
  ],
  Resources: [
    { label: 'Blog', to: '/blog' },
    { label: 'Guides', to: '/docs' },
    { label: 'SEO Glossary', to: '/docs' },
    { label: 'Compare Tools', to: '/#comparison' },
    { label: 'Case Studies', to: '/blog' },
  ],
  Company: [
    { label: 'About', to: '/#faq' },
    { label: 'Contact', to: '/contact' },
    { label: 'Careers', to: '/contact' },
    { label: 'Press', to: '/contact' },
    { label: 'Affiliate', to: '/contact' },
  ],
  Legal: [
    { label: 'Privacy', to: '/privacy' },
    { label: 'Terms', to: '/terms' },
    { label: 'Cookies', to: '/cookies' },
    { label: 'Security', to: '/privacy' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">ValueScan</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Automated website audits for SEO, SEM, marketing, and security. UK-based, GDPR-compliant.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://twitter.com/valuescan" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="ValueScan on Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/company/valuescan" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="ValueScan on LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://github.com/valuescan" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="ValueScan on GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://youtube.com/@valuescan" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="ValueScan on YouTube">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            GDPR Compliant
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
            <FileText className="w-3.5 h-3.5" />
            ISO 27001 Ready
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
            <Cookie className="w-3.5 h-3.5" />
            Cookie Consent
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ValueScan Ltd. All rights reserved.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <Link
              to="/admin-login"
              className="text-sm text-muted-foreground hover:text-amber-500 transition-colors"
            >
              Admin login
            </Link>
            <p className="text-sm text-muted-foreground">
              Built in London · VAT GB123456789
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
