const axios = require('axios');

const DFSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DFSEO_PASS = process.env.DATAFORSEO_PASSWORD || '';
const DFSEO_BASE = 'https://api.dataforseo.com/v3';

async function getKeywordsForDomain(domain, location = 2824, language = 'en') {
  if (!DFSEO_LOGIN || !DFSEO_PASS) {
    return { mock: true, keywords: generateMockKeywords(domain) };
  }
  try {
    const response = await axios.post(`${DFSEO_BASE}/keywords_data/google_ads/keywords_for_site/live`, [{
      target: domain,
      location_code: location,
      language_code: language,
      search_partners: true,
    }], {
      auth: { username: DFSEO_LOGIN, password: DFSEO_PASS },
      timeout: 30000,
    });
    const tasks = response.data?.tasks || [];
    const results = tasks[0]?.result?.[0]?.items || [];
    return {
      success: true,
      keywords: results.map(k => ({
        keyword: k.keyword,
        searchVolume: k.search_volume,
        cpc: k.cpc,
        competition: k.competition_index,
        competitionLevel: k.competition_level,
      })).slice(0, 50),
    };
  } catch (err) {
    return { success: false, error: err.message, keywords: generateMockKeywords(domain) };
  }
}

async function getKeywordIdeas(seed, location = 2824, language = 'en') {
  if (!DFSEO_LOGIN || !DFSEO_PASS) {
    return { mock: true, keywords: generateMockKeywords(seed) };
  }
  try {
    const response = await axios.post(`${DFSEO_BASE}/keywords_data/google_ads/keywords_for_keywords/live`, [{
      keywords: [seed],
      location_code: location,
      language_code: language,
    }], {
      auth: { username: DFSEO_LOGIN, password: DFSEO_PASS },
      timeout: 30000,
    });
    const tasks = response.data?.tasks || [];
    const results = tasks[0]?.result?.[0]?.items || [];
    return {
      success: true,
      keywords: results.map(k => ({
        keyword: k.keyword,
        searchVolume: k.search_volume,
        cpc: k.cpc,
        competition: k.competition_index,
      })).slice(0, 50),
    };
  } catch (err) {
    return { success: false, error: err.message, keywords: generateMockKeywords(seed) };
  }
}

async function getSERPResults(keyword, location = 2824, language = 'en') {
  if (!DFSEO_LOGIN || !DFSEO_PASS) {
    return { mock: true, results: generateMockSERP(keyword) };
  }
  try {
    const response = await axios.post(`${DFSEO_BASE}/serp/google/organic/live/advanced`, [{
      keyword,
      location_code: location,
      language_code: language,
      depth: 20,
    }], {
      auth: { username: DFSEO_LOGIN, password: DFSEO_PASS },
      timeout: 30000,
    });
    const tasks = response.data?.tasks || [];
    const results = tasks[0]?.result?.[0]?.items || [];
    return {
      success: true,
      results: results.map(r => ({
        position: r.rank_absolute,
        domain: r.domain,
        title: r.title,
        url: r.url,
        description: r.description,
      })).filter(r => r.position),
    };
  } catch (err) {
    return { success: false, error: err.message, results: generateMockSERP(keyword) };
  }
}

function generateMockKeywords(seed) {
  const base = seed.replace(/https?:\/\//, '').split('/')[0];
  return [
    { keyword: base, searchVolume: 5400, cpc: 2.45, competition: 72, competitionLevel: 'HIGH' },
    { keyword: `best ${base}`, searchVolume: 2900, cpc: 3.12, competition: 65, competitionLevel: 'MEDIUM' },
    { keyword: `${base} vs`, searchVolume: 1800, cpc: 1.89, competition: 58, competitionLevel: 'MEDIUM' },
    { keyword: `how to ${base}`, searchVolume: 1200, cpc: 0.95, competition: 45, competitionLevel: 'LOW' },
    { keyword: `free ${base}`, searchVolume: 900, cpc: 0.56, competition: 38, competitionLevel: 'LOW' },
    { keyword: `${base} tutorial`, searchVolume: 750, cpc: 1.23, competition: 42, competitionLevel: 'LOW' },
    { keyword: `top ${base} tools`, searchVolume: 650, cpc: 2.78, competition: 68, competitionLevel: 'HIGH' },
    { keyword: `${base} alternatives`, searchVolume: 520, cpc: 1.67, competition: 55, competitionLevel: 'MEDIUM' },
    { keyword: `${base} review`, searchVolume: 480, cpc: 1.45, competition: 50, competitionLevel: 'MEDIUM' },
    { keyword: `${base} pricing`, searchVolume: 420, cpc: 3.89, competition: 78, competitionLevel: 'HIGH' },
  ];
}

function generateMockSERP(keyword) {
  return [
    { position: 1, domain: 'en.wikipedia.org', title: `${keyword} - Wikipedia`, url: `https://en.wikipedia.org/wiki/${keyword}`, description: 'Wikipedia article about ' + keyword },
    { position: 2, domain: 'www.example.com', title: `What is ${keyword}?`, url: `https://www.example.com/${keyword}`, description: 'Learn about ' + keyword },
    { position: 3, domain: 'blog.medium.com', title: `${keyword} Guide 2024`, url: 'https://blog.medium.com/guide', description: 'A comprehensive guide' },
    { position: 4, domain: 'news.ycombinator.com', title: `Discuss ${keyword}`, url: 'https://news.ycombinator.com', description: 'Discussion thread' },
    { position: 5, domain: 'www.reddit.com', title: `r/${keyword}`, url: 'https://www.reddit.com', description: 'Reddit community' },
  ];
}

module.exports = { getKeywordsForDomain, getKeywordIdeas, getSERPResults };
