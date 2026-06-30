import { Link } from 'react-router-dom';
import MetaTags from '../layout/MetaTags';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaTags title="Refund Policy — ValueScan" description="Refund and cancellation policy." />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4 text-foreground">Refund Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
            <p className="mb-4">At ValueScan, we want you to be satisfied with your purchase. This Refund Policy outlines the circumstances under which we offer refunds for our subscription plans.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Free Plan</h2>
            <p className="mb-4">Our Free plan is available at no cost and does not require payment information. You can use the Free plan indefinitely subject to the daily usage limits.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Paid Subscriptions (Pro & Max)</h2>
            <p className="mb-4">We offer a <strong>14-day money-back guarantee</strong> for all paid subscriptions. If you are not satisfied with ValueScan Pro or Max for any reason, you can request a full refund within 14 days of your initial purchase.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">How to Request a Refund</h2>
            <p className="mb-4">To request a refund, please contact us at <a href="mailto:hello@valuescan.online" className="text-primary hover:text-primary/80 hover:underline transition-colors">hello@valuescan.online</a> with the following information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your account email address</li>
              <li>Date of purchase</li>
              <li>Reason for refund (optional, but helps us improve)</li>
            </ul>
            <p className="mb-4">Refund requests are typically processed within 5-7 business days. The refund will be issued to the original payment method.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">After the 14-Day Period</h2>
            <p className="mb-4">Refunds requested after the 14-day period are generally not available. However, we may consider exceptions on a case-by-case basis for technical issues that prevent you from using the service.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Cancellation</h2>
            <p className="mb-4">You can cancel your subscription at any time from your <Link to="/profile" className="text-primary hover:text-primary/80 hover:underline transition-colors">Profile</Link> page or by contacting support. When you cancel:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>You will continue to have access to your paid features until the end of your current billing period.</li>
              <li>No further charges will be made.</li>
              <li>We do not offer prorated refunds for partial months.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Annual Plans</h2>
            <p className="mb-4">Annual plans are eligible for the 14-day refund from the date of purchase. If you cancel after the refund period, you will retain access until the end of the annual term.</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Contact</h2>
            <p className="mb-4">For any questions about refunds, please contact us at <a href="mailto:hello@valuescan.online" className="text-primary hover:text-primary/80 hover:underline transition-colors">hello@valuescan.online</a> or open a support ticket at <Link to="/support" className="text-primary hover:text-primary/80 hover:underline transition-colors">/support</Link>.</p>
          </div>
          <div className="mt-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
