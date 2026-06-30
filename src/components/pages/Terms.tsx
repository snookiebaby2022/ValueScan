import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';

export default function Terms() {
  const navigate = useNavigate();

  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title="Terms of Service — ValueScan" description="User agreement and policies." />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Terms of Service</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">By accessing or using ValueScan ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to all the terms, you may not use the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">2. Description of Service</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">ValueScan provides SEO auditing tools, website analysis, keyword research, rank tracking, and related digital marketing services. We crawl publicly available websites and analyse their technical SEO, performance, security, and marketing configuration.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">3. User Accounts</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorised use. You must be at least 18 years old to create an account.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">4. Subscription & Payments</h2>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
                <li>Subscription fees are billed in advance on a monthly basis</li>
                <li>All prices are in GBP (British Pounds) and exclude VAT where applicable</li>
                <li>You may cancel your subscription at any time; access continues until the end of the billing period</li>
                <li>No refunds are provided for partial months</li>
                <li>We reserve the right to change pricing with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">5. Prohibited Uses</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">You may not use the Service to:</p>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
                <li>Crawl or audit websites without proper authorisation</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Attempt to gain unauthorised access to any part of the Service</li>
                <li>Use the Service for any illegal purpose</li>
                <li>Share your account credentials with third parties</li>
                <li>Resell or redistribute audit data without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">6. Intellectual Property</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">All content, software, and technology provided by ValueScan are owned by us or our licensors. You retain ownership of your audit data. We grant you a limited, non-exclusive licence to use the Service for its intended purpose.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">7. Limitation of Liability</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">To the maximum extent permitted by law, ValueScan shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid in the 12 months preceding the claim.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">8. Termination</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">We may suspend or terminate your account for violations of these Terms. Upon termination, your right to use the Service ceases immediately. Your data may be retained for a reasonable period for legal and operational purposes.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">9. Changes to Terms</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">We may modify these Terms at any time. Material changes will be notified via email or through the Service. Continued use after changes constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">10. Contact Information</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">For questions about these Terms, please contact us at <a href="mailto:support@valuescan.online" className="text-purple-600 hover:text-purple-700 hover:underline transition-colors">support@valuescan.online</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
