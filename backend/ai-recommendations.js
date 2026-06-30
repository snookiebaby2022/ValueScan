const axios = require('axios');

const RECOMMENDATIONS = {
  // SEO recommendations
  'Title tag': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('Title') && c.type === 'error'),
    advice: 'Add a unique, descriptive title tag (50-60 characters) to every page. Include your primary keyword near the beginning.',
    priority: 'high',
  },
  'Meta description': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('Meta description') && c.type === 'error'),
    advice: 'Write compelling meta descriptions (150-160 characters) that include your target keyword and a clear call-to-action.',
    priority: 'high',
  },
  'H1 tag': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('H1') && c.type === 'error'),
    advice: 'Ensure every page has exactly one H1 tag that clearly describes the page content and includes your primary keyword.',
    priority: 'high',
  },
  'Image alt text': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('alt text') && c.type === 'warning'),
    advice: 'Add descriptive alt text to all images. This improves accessibility and helps images rank in Google Image Search.',
    priority: 'medium',
  },
  'Canonical tag': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('canonical') && c.type === 'error'),
    advice: 'Add canonical tags to prevent duplicate content issues and consolidate link equity to the preferred URL version.',
    priority: 'medium',
  },
  'Schema markup': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('JSON-LD') && c.type === 'warning'),
    advice: 'Add structured data (Schema.org) to help search engines understand your content and enable rich snippets.',
    priority: 'medium',
  },
  'Open Graph tags': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('Open Graph') && c.type === 'warning'),
    advice: 'Add Open Graph meta tags so your content looks great when shared on social media platforms.',
    priority: 'low',
  },
  // SEM recommendations
  'Google Analytics': {
    check: (report) => report.categories?.sem?.checks?.find(c => c.message.includes('Google Analytics') && c.type === 'warning'),
    advice: 'Install Google Analytics 4 to track user behavior, traffic sources, and conversion metrics.',
    priority: 'high',
  },
  'Meta Pixel': {
    check: (report) => report.categories?.sem?.checks?.find(c => c.message.includes('Meta Pixel') && c.type === 'warning'),
    advice: 'Consider adding Meta Pixel for retargeting and conversion tracking if you run Facebook/Instagram ads.',
    priority: 'medium',
  },
  // Security recommendations
  'HTTPS': {
    check: (report) => report.categories?.security?.checks?.find(c => c.message.includes('HTTP') && c.type === 'error'),
    advice: 'Migrate to HTTPS immediately. Use a free SSL certificate from Let\'s Encrypt if needed.',
    priority: 'critical',
  },
  'HSTS header': {
    check: (report) => report.categories?.security?.checks?.find(c => c.message.includes('HSTS') && c.type === 'warning'),
    advice: 'Enable HSTS (HTTP Strict Transport Security) to prevent downgrade attacks and improve security.',
    priority: 'medium',
  },
  'CSP header': {
    check: (report) => report.categories?.security?.checks?.find(c => c.message.includes('CSP') && c.type === 'warning'),
    advice: 'Implement a Content Security Policy to prevent XSS attacks and data injection.',
    priority: 'medium',
  },
  'SSL expiry': {
    check: (report) => report.categories?.security?.checks?.find(c => c.message.includes('expires') && c.type === 'warning'),
    advice: 'Renew your SSL certificate before it expires. Set up auto-renewal with Let\'s Encrypt.',
    priority: 'high',
  },
  // Performance recommendations
  'Response time': {
    check: (report) => report.categories?.performance?.checks?.find(c => c.message.includes('Slow') && c.type === 'error'),
    advice: 'Improve server response time. Consider a CDN, caching, or upgrading your hosting plan.',
    priority: 'high',
  },
  'HTML size': {
    check: (report) => report.categories?.performance?.checks?.find(c => c.message.includes('Large HTML') && c.type === 'warning'),
    advice: 'Reduce HTML size by removing unused code, minifying assets, and splitting large pages.',
    priority: 'medium',
  },
  'Compression': {
    check: (report) => report.categories?.performance?.checks?.find(c => c.message.includes('No compression') && c.type === 'warning'),
    advice: 'Enable gzip or Brotli compression on your server to reduce file sizes by 70-80%.',
    priority: 'medium',
  },
  'LCP': {
    check: (report) => report.categories?.performance?.checks?.find(c => c.message.includes('LCP') && c.type === 'error'),
    advice: 'Optimize Largest Contentful Paint by compressing images, using a CDN, and reducing render-blocking resources.',
    priority: 'high',
  },
  // Mobile & Accessibility
  'Mobile viewport': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('Missing mobile viewport') && c.type === 'warning'),
    advice: 'Add a proper viewport meta tag to ensure your site renders correctly on mobile devices.',
    priority: 'high',
  },
  'Form labels': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('missing labels') && c.type === 'warning'),
    advice: 'Add labels or aria-labels to all form inputs for accessibility and better screen reader support.',
    priority: 'medium',
  },
  'Skip link': {
    check: (report) => report.categories?.seo?.checks?.find(c => c.message.includes('skip-to-content') && c.type === 'warning'),
    advice: 'Add a skip-to-content link to improve keyboard navigation and accessibility.',
    priority: 'low',
  },
};

function generateRecommendations(report) {
  const recommendations = [];
  
  for (const [name, config] of Object.entries(RECOMMENDATIONS)) {
    const issue = config.check(report);
    if (issue) {
      recommendations.push({
        name,
        advice: config.advice,
        priority: config.priority,
        issue: issue.message,
      });
    }
  }
  
  // Sort by priority: critical, high, medium, low
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  // Add general recommendations based on overall score
  if (report.score < 50) {
    recommendations.push({
      name: 'Overall score critical',
      advice: 'Your site score is very low. Focus on fixing the critical and high priority issues first. Run weekly audits to track progress.',
      priority: 'critical',
      issue: `Score: ${report.score}/100`,
    });
  } else if (report.score < 70) {
    recommendations.push({
      name: 'Improvement opportunity',
      advice: 'Your site has good foundations but needs improvement. Address the high-priority issues to boost your score above 70.',
      priority: 'medium',
      issue: `Score: ${report.score}/100`,
    });
  }
  
  return recommendations;
}

// Advanced AI recommendations using OpenAI (if API key available)
async function generateAIRecommendations(report, openaiKey) {
  const baseRecommendations = generateRecommendations(report);
  
  if (!openaiKey) {
    return baseRecommendations;
  }
  
  try {
    const prompt = `Analyze this website audit report and provide 3-5 actionable SEO recommendations. Be specific and practical.

Site: ${report.url}
Score: ${report.score}/100
Issues: ${report.issues}
Warnings: ${report.warnings}

Key findings:
${report.categories?.seo?.checks?.map(c => `- ${c.message}`).join('\n') || 'No specific findings'}

Provide recommendations in this format:
1. [Priority] Issue: [brief description] | Fix: [specific actionable step]
`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }, {
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    });
    
    const aiText = response.data.choices[0].message.content;
    
    // Parse AI response into structured recommendations
    const aiRecommendations = aiText.split('\n')
      .filter(line => line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.') || line.trim().startsWith('4.') || line.trim().startsWith('5.'))
      .map(line => {
        const match = line.match(/\d+\.\s*(?:\[([^\]]+)\])?\s*(?:Issue:\s*([^|]+))?(?:\s*\|\s*Fix:\s*(.+))?/);
        if (match) {
          return {
            name: match[2]?.trim() || 'AI Recommendation',
            advice: match[3]?.trim() || line.trim(),
            priority: match[1]?.toLowerCase() || 'medium',
            issue: 'AI-generated insight',
            source: 'ai',
          };
        }
        return null;
      })
      .filter(Boolean);
    
    return [...baseRecommendations, ...aiRecommendations];
  } catch (err) {
    console.error('AI recommendation failed:', err.message);
    return baseRecommendations;
  }
}

module.exports = { generateRecommendations, generateAIRecommendations };
