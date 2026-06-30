import { useState, useEffect } from 'react';
import MetaTags from '../layout/MetaTags'
import CookieConsent from '../layout/CookieConsent'
import ScrollProgress from '../animations/ScrollProgress'
import WelcomeScreen from '../animations/WelcomeScreen'
import Hero from '../sections/Hero'
import LogoMarquee from '../sections/LogoMarquee'
import AgentFeatures from '../sections/AgentFeatures'
import AnalyticsPreview from '../sections/AnalyticsPreview'
import LiveDemo from '../sections/LiveDemo'
import AuditDashboard from '../sections/AuditDashboard'
import HowItWorks from '../sections/HowItWorks'
import Integrations from '../sections/Integrations'
import Comparison from '../sections/Comparison'
import CaseStudies from '../sections/CaseStudies'
import Testimonials from '../sections/Testimonials'
import SocialProof from '../sections/SocialProof'
import Pricing from '../sections/Pricing'
import BlogSection from '../sections/BlogSection'
import FAQ from '../sections/FAQ'
import Newsletter from '../sections/Newsletter'
import Affiliate from '../sections/Affiliate'
import CTABanner from '../sections/CTABanner'
import Footer from '../layout/Footer'
import VideoEmbed from '../sections/VideoEmbed'
import RealScreenshots from '../sections/RealScreenshots'

export default function LandingPage() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('valuescan-welcome-shown');
    if (!shown) {
      setShowWelcome(true);
    } else {
      setWelcomeDone(true);
    }
  }, []);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    setWelcomeDone(true);
  };

  return (
    <>
      <MetaTags title="ValueScan — Automated Website Audits" description="Instant SEO, SEM, security and technical audits. Run 50+ checks in seconds." canonical="https://valuescan.online/" />
      <div className={`min-h-screen bg-background text-foreground ${!welcomeDone ? 'overflow-hidden' : ''}`}>
      {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}
      {welcomeDone && (
        <>
          <ScrollProgress />
          <main>
            <Hero />
            <LogoMarquee />
            <AgentFeatures />
            <VideoEmbed />
            <RealScreenshots />
            <AnalyticsPreview />
            <LiveDemo />
            <AuditDashboard />
            <HowItWorks />
            <Integrations />
            <Comparison />
            <CaseStudies />
            <Testimonials />
            <SocialProof />
            <Pricing />
            <BlogSection />
            <FAQ />
            <Newsletter />
            <Affiliate />
            <CTABanner />
          </main>
          <Footer />
          <CookieConsent />
        </>
      )}
    </div>
    </>
  );
}
