import { Link } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Cookie Policy — ValueScan" description="How we use cookies." />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4 text-foreground">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
            <p className="mb-4">Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">How We Use Cookies</h2>
            <p className="mb-4">ValueScan uses cookies for the following purposes:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Essential cookies:</strong> Required for the website to function properly, including authentication and security.</li>
              <li><strong>Preferences:</strong> Remember your settings such as theme preference (dark/light mode).</li>
              <li><strong>Analytics:</strong> We use Google Analytics (with your consent) to understand how visitors use our site. This helps us improve our service.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Types of Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg mb-6">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Cookie</th>
                    <th className="text-left p-3">Purpose</th>
                    <th className="text-left p-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">token</td>
                    <td className="p-3">Authentication session</td>
                    <td className="p-3">Session / 7 days</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">theme</td>
                    <td className="p-3">Dark/light mode preference</td>
                    <td className="p-3">Persistent</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">cookie-consent</td>
                    <td className="p-3">Stores your cookie consent choice</td>
                    <td className="p-3">1 year</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">_ga, _gid</td>
                    <td className="p-3">Google Analytics (only with consent)</td>
                    <td className="p-3">2 years / 24 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Managing Cookies</h2>
            <p className="mb-4">You can control and manage cookies through your browser settings. Most browsers allow you to refuse cookies or delete existing cookies. However, please note that disabling essential cookies may affect the functionality of this website.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Your Consent</h2>
            <p className="mb-4">When you first visit ValueScan, we show a cookie consent banner. You can choose to accept or decline non-essential cookies. You can change your preference at any time by clearing your browser cookies and revisiting the site.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Third-Party Cookies</h2>
            <p className="mb-4">We use Google Analytics for website analytics. This service may set cookies on your device. These cookies are only placed with your explicit consent.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Contact Us</h2>
            <p className="mb-4">If you have any questions about our Cookie Policy, please contact us at <a href="mailto:hello@valuescan.online" className="text-primary hover:text-primary/80 hover:underline transition-colors">hello@valuescan.online</a>.</p>
          </div>
          <div className="mt-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
