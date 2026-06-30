const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF(auditData, outputPath) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const html = buildReportHTML(auditData);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    return { success: true, path: outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

function generateCSV(auditData) {
  try {
    const rows = [];
    rows.push(['Category', 'Check', 'Status', 'Message']);

    if (auditData.categories) {
      Object.entries(auditData.categories).forEach(([cat, data]) => {
        (data.checks || []).forEach(check => {
          rows.push([cat, '', check.type, check.message]);
        });
      });
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    return { success: true, csv };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function buildReportHTML(data) {
  const scoreColor = (s) => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = (s) => s >= 80 ? 'Excellent' : s >= 50 ? 'Needs Improvement' : 'Critical';

  let checksHTML = '';
  if (data.categories) {
    Object.entries(data.categories).forEach(([cat, catData]) => {
      const pct = Math.round((catData.score / catData.max) * 100);
      checksHTML += `
        <div style="margin-bottom: 20px;">
          <h3 style="text-transform: uppercase; font-size: 14px; color: #666; margin-bottom: 10px;">${cat} (${pct}%)</h3>
          ${(catData.checks || []).map(c => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; background: ${c.type === 'success' ? '#f0fdf4' : c.type === 'warning' ? '#fffbeb' : '#fef2f2'}; margin-bottom: 4px;">
              <span style="font-size: 16px;">${c.type === 'success' ? '✅' : c.type === 'warning' ? '⚠️' : '❌'}</span>
              <span style="font-size: 13px; color: #333;">${c.message}</span>
            </div>
          `).join('')}
        </div>
      `;
    });
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Audit Report - ${data.url || 'Unknown'}</title>
    </head>
    <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7c3aed; margin-bottom: 8px;">ValueScan Audit Report</h1>
        <p style="color: #666;">${data.url || 'Unknown'}</p>
        <p style="color: #999; font-size: 12px;">${new Date().toLocaleString()}</p>
      </div>
      <div style="display: flex; justify-content: center; margin-bottom: 30px;">
        <div style="width: 120px; height: 120px; border-radius: 50%; border: 8px solid ${scoreColor(data.score || 0)}; display: flex; align-items: center; justify-content: center;">
          <div style="text-align: center;">
            <div style="font-size: 36px; font-weight: bold; color: ${scoreColor(data.score || 0)};">${data.score || 0}</div>
            <div style="font-size: 12px; color: #666;">${scoreLabel(data.score || 0)}</div>
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 30px;">
        <div style="text-align: center; padding: 10px 20px; background: #fef2f2; border-radius: 8px;">
          <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${data.issues || 0}</div>
          <div style="font-size: 12px; color: #666;">Errors</div>
        </div>
        <div style="text-align: center; padding: 10px 20px; background: #fffbeb; border-radius: 8px;">
          <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${data.warnings || 0}</div>
          <div style="font-size: 12px; color: #666;">Warnings</div>
        </div>
      </div>
      ${checksHTML}
    </body>
    </html>
  `;
}

module.exports = { generatePDF, generateCSV };
