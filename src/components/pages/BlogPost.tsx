import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Twitter, Linkedin, Share2 } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const blogPosts: Record<string, {
  title: string; date: string; readTime: string; tag: string;
  content: string; author: string; authorRole: string;
}> = {
  'core-web-vitals': {
    title: 'How to Fix Core Web Vitals in 2026: A Complete Guide',
    date: 'Jun 18, 2026', readTime: '8 min', tag: 'Performance',
    author: 'Sarah Chen', authorRole: 'Performance Lead, ValueScan',
    content: `<p>Google's Core Web Vitals (CWV) are the three metrics that determine how your site performs in real-world conditions: <strong>Largest Contentful Paint (LCP)</strong>, <strong>First Input Delay (FID)</strong>, and <strong>Cumulative Layout Shift (CLS)</strong>.</p>

<p>In 2026, Google made these metrics stricter. The new thresholds mean more sites are failing than ever. Here is exactly how to fix each one.</p>

<h2>1. Fix LCP (Largest Contentful Paint)</h2>
<p>LCP measures how long your largest visible element takes to load. Target: under 2.5 seconds.</p>
<ul><li>Preload your hero image: <code>&lt;link rel="preload" as="image" href="hero.jpg"&gt;</code></li><li>Use a CDN for static assets (Cloudflare, BunnyCDN, or CloudFront)</li><li>Compress images with AVIF or WebP — aim for under 100KB each</li><li>Remove render-blocking scripts from the <code>&lt;head&gt;</code></li></ul>

<h2>2. Fix FID / INP (Interaction to Next Paint)</h2>
<p>FID was replaced by INP in 2024. INP measures the slowest interaction on your page. Target: under 200ms.</p>
<ul><li>Break up long JavaScript tasks into smaller chunks</li><li>Use <code>requestIdleCallback</code> for non-critical work</li><li>Debounce event handlers (scroll, resize, input)</li><li>Lazy-load third-party scripts (analytics, chat widgets, ads)</li></ul>

<h2>3. Fix CLS (Cumulative Layout Shift)</h2>
<p>CLS measures visual stability. Target: under 0.1.</p>
<ul><li>Always set width and height on images and videos</li><li>Reserve space for ads and embeds before they load</li><li>Never inject content above existing content without reserving space</li><li>Use <code>font-display: swap</code> with preloaded fonts</li></ul>

<h2>Quick Wins Checklist</h2>
<ul><li>Enable Brotli compression on your server</li><li>Use HTTP/2 or HTTP/3</li><li>Set proper Cache-Control headers for static assets</li><li>Remove unused CSS and JavaScript</li><li>Use a service worker for offline caching</li></ul>

<p>Run ValueScan on your site and see your CWV scores in seconds. The audit will flag exactly which element is causing your LCP to spike and which script is blocking interaction.</p>`,
  },
  'solo-founder-seo': {
    title: "The Solo Founder's SEO Playbook: Zero to Ranked",
    date: 'Jun 15, 2026', readTime: '12 min', tag: 'SEO',
    author: 'David Park', authorRole: 'Founder, TaskFlow',
    content: `<p>No budget, no team, no problem. Here is the exact strategy we used to grow from 0 to 50,000 monthly organic visitors in 18 months — as a solo founder with £0 spent on ads.</p>

<h2>Phase 1: Keyword Research (Week 1–2)</h2>
<p>Do not chase high-volume keywords. Chase <strong>low-competition, high-intent</strong> keywords instead.</p>
<ul><li>Use free tools: Google Search Console, Google Autocomplete, Reddit, Quora</li><li>Look for keywords with 3–5 words (long-tail) and under 1,000 monthly searches</li><li>Check the SERP: if the top results are forums, Reddit, or thin pages, you can outrank them</li></ul>

<h2>Phase 2: Content Creation (Week 3–8)</h2>
<p>One high-quality article beats 10 thin ones. Target 2,000+ words per post.</p>
<ul><li>Answer the question better than anyone else on the first page</li><li>Include original data, screenshots, or step-by-step instructions</li><li>Update your top 5 posts every 3 months</li></ul>

<h2>Phase 3: Technical SEO (Week 9–12)</h2>
<ul><li>Fix all broken links (404s)</li><li>Add schema markup for FAQs, articles, and breadcrumbs</li><li>Create an XML sitemap and submit to Google</li><li>Ensure mobile-friendliness (Google is mobile-first)</li></ul>

<h2>Phase 4: Link Building (Ongoing)</h2>
<ul><li>Write guest posts for 2–3 sites in your niche per month</li><li>Create free tools or calculators that earn backlinks naturally</li><li>Answer HARO queries weekly (Help A Reporter Out)</li><li>Share your content on relevant subreddits and LinkedIn</li></ul>

<p>The key is consistency. Most founders quit after 3 months. If you publish one high-quality article every 2 weeks for a year, you will outrank 90% of your competitors.</p>`,
  },
  'marketing-tags': {
    title: "Marketing Tags You're Probably Missing (And Losing Conversions)",
    date: 'Jun 12, 2026', readTime: '6 min', tag: 'SEM',
    author: 'Priya Patel', authorRole: 'Marketing Director, GrowthHub',
    content: `<p>Most sites miss 3–5 critical marketing tags. These are not optional extras — they are the difference between knowing what works and guessing blindly.</p>

<h2>The 5 Tags Every Site Needs</h2>

<h3>1. Google Analytics 4 (GA4)</h3>
<p>GA4 replaced Universal Analytics in 2023. If you still have the old <code>UA-</code> code, your tracking is broken. Install GA4 via gtag.js or Google Tag Manager.</p>

<h3>2. Meta Pixel (Facebook / Instagram)</h3>
<p>Without the Meta Pixel, you cannot retarget visitors who did not convert. Even if you do not run ads now, install the pixel so you have an audience ready when you start.</p>

<h3>3. Google Ads Conversion Tag</h3>
<p>If you run Google Ads, the conversion tag tells Google which clicks turned into customers. Without it, Google cannot optimise your bidding.</p>

<h3>4. LinkedIn Insight Tag</h3>
<p>For B2B, LinkedIn is often the highest-intent channel. The Insight Tag lets you track conversions from LinkedIn ads and build matched audiences.</p>

<h3>5. Hotjar / Clarity</h3>
<p>Heatmaps and session recordings reveal where users get stuck. Microsoft Clarity is free and takes 2 minutes to install.</p>

<h2>How to Check Your Tags</h2>
<p>Run ValueScan on your site. The SEM audit checks for all 5 tags and tells you exactly which ones are missing and where to install them.</p>`,
  },
  'security-headers': {
    title: 'Security Headers Explained for Non-Developers',
    date: 'Jun 10, 2026', readTime: '10 min', tag: 'Security',
    author: 'Marcus Johnson', authorRole: 'DevOps Lead, AgencyOne',
    content: `<p>HSTS, CSP, X-Frame-Options — these headers sound scary but they are simple one-line fixes that protect your users and your rankings.</p>

<h2>1. HSTS (HTTP Strict Transport Security)</h2>
<p><strong>What it does:</strong> Forces browsers to always use HTTPS, even if the user types <code>http://</code>.</p>
<p><strong>Why it matters:</strong> Prevents SSL stripping attacks. Without it, an attacker can downgrade your connection to HTTP.</p>
<p><strong>How to add it:</strong></p>
<pre>add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;</pre>

<h2>2. CSP (Content Security Policy)</h2>
<p><strong>What it does:</strong> Tells the browser exactly which domains are allowed to load scripts, images, styles, and fonts.</p>
<p><strong>Why it matters:</strong> Prevents XSS (cross-site scripting) attacks by blocking inline scripts from unknown sources.</p>
<p><strong>How to add it:</strong></p>
<pre>add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;</pre>

<h2>3. X-Frame-Options</h2>
<p><strong>What it does:</strong> Prevents your site from being embedded in an iframe on another domain.</p>
<p><strong>Why it matters:</strong> Prevents clickjacking attacks where a malicious site tricks users into clicking hidden buttons.</p>
<p><strong>How to add it:</strong></p>
<pre>add_header X-Frame-Options "SAMEORIGIN" always;</pre>

<h2>Check Your Headers in Seconds</h2>
<p>ValueScan checks all security headers in every audit. If any are missing, you get the exact fix and the expected security score improvement.</p>`,
  },
  'geo-optimisation': {
    title: 'GEO: What It Is and Why Your Site Needs It in 2026',
    date: 'Jun 5, 2026', readTime: '9 min', tag: 'GEO',
    author: 'Elena Rossi', authorRole: 'Solo Founder',
    content: `<p>Generative Engine Optimisation (GEO) is the new SEO. It is about making sure AI search engines like ChatGPT, Perplexity, Gemini, and Copilot describe your brand accurately — and recommend you.</p>

<h2>How AI Search Engines Work</h2>
<p>Unlike Google, which crawls and indexes pages, AI search engines synthesise answers from multiple sources. They do not send traffic to your site directly — they mention your brand in the answer.</p>

<h2>Why GEO Matters</h2>
<p>In 2026, over 40% of product discovery starts with an AI chat query, not a Google search. If someone asks "What is the best website audit tool?" and the AI does not mention you, you just lost a customer.</p>

<h2>How to Optimise for GEO</h2>
<ul><li><strong>Clear, factual content:</strong> AI models extract facts. Use structured data, bullet points, and clear definitions.</li><li><strong>Authoritative mentions:</strong> Get cited on Wikipedia, Reddit, and high-trust forums. AI models weight these heavily.</li><li><strong>Brand consistency:</strong> Use the same description of your product across your site, social media, and directories.</li><li><strong>Answer common questions:</strong> Create FAQ pages that directly answer questions your audience asks.</li><li><strong>LLMs.txt:</strong> Create an <code>/llms.txt</code> file that summarises your brand for AI models. This is the new <code>robots.txt</code>.</li></ul>

<h2>Track Your GEO Visibility</h2>
<p>ValueScan's GEO Agent monitors how AI search engines describe your brand. It alerts you when your mentions drop or when competitors start appearing in answers you used to own.</p>`,
  },
  'competitor-analysis': {
    title: 'Competitor Analysis: How to Steal Traffic Without Stealing',
    date: 'May 28, 2026', readTime: '11 min', tag: 'Strategy',
    author: 'Alex Thompson', authorRole: 'CTO, CloudSync',
    content: `<p>Ethical ways to reverse-engineer what your competitors are doing right — and where they are vulnerable.</p>

<h2>Step 1: Identify Your Real Competitors</h2>
<p>Do not just look at direct competitors. Look at who ranks for the same keywords you want.</p>
<ul><li>Search your target keywords on Google and note the top 10 results</li><li>Use ValueScan's competitor analysis to compare scores side-by-side</li><li>Check their backlinks, traffic estimates, and content strategy</li></ul>

<h2>Step 2: Find Their Content Gaps</h2>
<ul><li>What topics do they rank for that you do not?</li><li>What topics do they ignore that you could own?</li><li>What questions are unanswered on their blog?</li></ul>

<h2>Step 3: Reverse-Engineer Their Backlinks</h2>
<ul><li>Use free tools to see who links to them</li><li>Reach out to the same sites with better content</li><li>Look for broken links on referring sites and offer your page as a replacement</li></ul>

<h2>Step 4: Speed Up Where They Are Slow</h2>
<ul><li>Run ValueScan on their site and on yours</li><li>Fix every issue they have before they do</li><li>Focus on the issues that affect SEO score the most</li></ul>

<p>Competitor analysis is not about copying. It is about learning from their mistakes and capitalising on their blind spots.</p>`,
  },
};

const allArticles = [
  { slug: 'core-web-vitals', title: 'How to Fix Core Web Vitals in 2026', tag: 'Performance', readTime: '8 min' },
  { slug: 'solo-founder-seo', title: "The Solo Founder's SEO Playbook", tag: 'SEO', readTime: '12 min' },
  { slug: 'marketing-tags', title: "Marketing Tags You're Probably Missing", tag: 'SEM', readTime: '6 min' },
  { slug: 'security-headers', title: 'Security Headers Explained', tag: 'Security', readTime: '10 min' },
  { slug: 'geo-optimisation', title: 'GEO: What It Is and Why You Need It', tag: 'GEO', readTime: '9 min' },
  { slug: 'competitor-analysis', title: 'Competitor Analysis: Steal Traffic Ethically', tag: 'Strategy', readTime: '11 min' },
];

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPosts[slug] : null;
  const { ref } = useInView(0.1);

  const related = post
    ? allArticles.filter((a) => a.slug !== slug && a.tag === post.tag).slice(0, 3)
    : [];

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = post?.title || 'Check out this article';
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        break;
    }
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Article not found</h1>
          <p className="text-muted-foreground mb-4">That blog post does not exist.</p>
          <Link to="/blog" className="text-primary hover:underline">← Back to blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">


      <main className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{post.tag}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 leading-tight">{post.title}</h1>

            <div className="flex items-center gap-3 mb-10 pb-10 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-primary">
                {post.author[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{post.author}</p>
                <p className="text-xs text-muted-foreground">{post.authorRole}</p>
              </div>
            </div>

            <article
              ref={ref}
              className="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-muted-foreground prose-p:leading-[1.8] prose-p:mb-5 prose-ul:text-muted-foreground prose-ul:space-y-1.5 prose-ul:mb-5 prose-li:marker:text-primary prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-foreground prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[#30363d] prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:text-sm prose-pre:leading-relaxed prose-pre:shadow-sm prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="mt-16 pt-8 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Share:</span>
                <button onClick={() => handleShare('twitter')} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title="Share on Twitter"><Twitter className="w-4 h-4" /></button>
                <button onClick={() => handleShare('linkedin')} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title="Share on LinkedIn"><Linkedin className="w-4 h-4" /></button>
                <button onClick={() => handleShare('copy')} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title="Copy link"><Share2 className="w-4 h-4" /></button>
              </div>
              <Link to="/blog" className="text-sm text-primary hover:underline">More articles →</Link>
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <div className="mt-16 pt-8 border-t border-border">
                <h3 className="text-lg font-bold mb-6">Related articles</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((article) => (
                    <Link
                      key={article.slug}
                      to={`/blog/${article.slug}`}
                      className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 inline-block">{article.tag}</span>
                      <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">{article.title}</h4>
                      <p className="text-xs text-muted-foreground mt-2">{article.readTime} read</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
