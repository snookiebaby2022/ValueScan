const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY || '';

async function runPageSpeed(url) {
  try {
    if (!url.startsWith('http')) url = 'https://' + url;
    const apiKey = PAGESPEED_API_KEY ? `&key=${PAGESPEED_API_KEY}` : '';
    
    const [desktop, mobile] = await Promise.all([
      axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop${apiKey}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`, { timeout: 30000 }),
      axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile${apiKey}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`, { timeout: 30000 })
    ]);

    const extractMetrics = (data) => {
      const lighthouse = data.data?.lighthouseResult;
      const loading = lighthouse?.audits;
      const categories = lighthouse?.categories;
      return {
        score: Math.round(categories?.performance?.score * 100) || 0,
        accessibility: Math.round(categories?.accessibility?.score * 100) || 0,
        bestPractices: Math.round(categories?.['best-practices']?.score * 100) || 0,
        seo: Math.round(categories?.seo?.score * 100) || 0,
        lcp: loading?.['largest-contentful-paint']?.displayValue || 'N/A',
        cls: loading?.['cumulative-layout-shift']?.displayValue || 'N/A',
        tbt: loading?.['total-blocking-time']?.displayValue || 'N/A',
        fcp: loading?.['first-contentful-paint']?.displayValue || 'N/A',
        si: loading?.['speed-index']?.displayValue || 'N/A',
        tti: loading?.['interactive']?.displayValue || 'N/A',
        fcpNumeric: loading?.['first-contentful-paint']?.numericValue || 0,
        lcpNumeric: loading?.['largest-contentful-paint']?.numericValue || 0,
        tbtNumeric: loading?.['total-blocking-time']?.numericValue || 0,
        clsNumeric: loading?.['cumulative-layout-shift']?.numericValue || 0,
      };
    };

    return {
      success: true,
      url,
      desktop: extractMetrics(desktop),
      mobile: extractMetrics(mobile),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      url,
    };
  }
}

module.exports = { runPageSpeed };
