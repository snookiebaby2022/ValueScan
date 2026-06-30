import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Privacy Policy — ValueScan" description="How we handle your data." />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">1. Introduction</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">ValueScan ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website and services.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">2. Information We Collect</h2>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
                <li><strong>Personal Data:</strong> Name, email address, company name, and billing information provided during registration or checkout.</li>
                <li><strong>Usage Data:</strong> Information about how you use our services, including audit history, keyword searches, and tool interactions.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
                <li>To provide and maintain our SEO audit services</li>
                <li>To process payments and manage subscriptions</li>
                <li>To send you service updates, security alerts, and marketing communications (with your consent)</li>
                <li>To improve our services and develop new features</li>
                <li>To detect and prevent fraud and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">4. Data Sharing</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">We do not sell your personal data. We may share data with:</p>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
                <li><strong>Payment Processors:</strong> Stripe for handling subscription payments</li>
                <li><strong>Service Providers:</strong> Hosting providers and analytics services</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">5. Data Security</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">We implement industry-standard security measures including HTTPS encryption, password hashing with bcrypt, and secure database storage. However, no method of transmission over the internet is 100% secure.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">6. Cookies</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">We use cookies to remember your preferences, authenticate your sessions, and analyse usage patterns. You can disable cookies in your browser settings, but some features may not work properly.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">7. Your Rights</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Object to processing for marketing purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">8. Data Retention</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">We retain your personal data for as long as your account is active or as needed to provide you with services. You may request deletion of your account and associated data at any time.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">9. Contact Us</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@valuescan.online" className="text-purple-600 hover:text-purple-700 hover:underline transition-colors">support@valuescan.online</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
