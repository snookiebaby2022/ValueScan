const cron = require('node-cron');
const { crawlWebsite } = require('./audit-engine');
const db = require('./db');
const { sendAlertEmail } = require('./email');
const { cleanupHistory } = require('./server');

let scheduledTasks = new Map();

function startCronJobs() {
  // Daily alert checker at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily alert checks...');
    await checkAlerts();
  }, { timezone: 'Europe/London' });

  // Weekly full re-audit of all tracked URLs (Sundays at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    console.log('[CRON] Running weekly re-audits...');
    await runWeeklyAudits();
  }, { timezone: 'Europe/London' });

  // Daily history cleanup at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Running daily history cleanup...');
    await cleanupHistory();
  }, { timezone: 'Europe/London' });

  console.log('[CRON] Jobs scheduled');
}

async function checkAlerts() {
  try {
    const alerts = await db.getAllActiveAlerts();
    for (const alert of alerts) {
      const report = await crawlWebsite(alert.url);
      if (report.error) continue;
      
      if (alert.last_score && alert.last_score !== report.score) {
        const user = await db.getUserById(alert.user_id);
        if (user?.email) {
          await sendAlertEmail(user.email, alert.url, alert.last_score, report.score);
        }
      }
      
      await db.updateAlertScore(alert.id, report.score);
    }
  } catch (err) {
    console.error('[CRON ERROR] checkAlerts:', err.message);
  }
}

async function runWeeklyAudits() {
  try {
    const allAudits = await db.getDistinctUrls();
    for (const audit of allAudits) {
      const report = await crawlWebsite(audit.url);
      if (!report.error) {
        await db.saveAudit(audit.user_id, audit.url, report.score, report.issues, report.warnings, report);
      }
    }
  } catch (err) {
    console.error('[CRON ERROR] runWeeklyAudits:', err.message);
  }
}

function scheduleUserAudit(userId, url, frequency) {
  const key = `${userId}_${url}`;
  if (scheduledTasks.has(key)) {
    scheduledTasks.get(key).destroy();
  }
  
  const cronExpr = frequency === 'daily' ? '0 9 * * *' : frequency === 'weekly' ? '0 9 * * 1' : '0 9 1 * *';
  const task = cron.schedule(cronExpr, async () => {
    const report = await crawlWebsite(url);
    if (!report.error) {
      await db.saveAudit(userId, url, report.score, report.issues, report.warnings, report);
    }
  });
  
  scheduledTasks.set(key, task);
  return { success: true };
}

module.exports = { startCronJobs, checkAlerts, runWeeklyAudits, scheduleUserAudit };
