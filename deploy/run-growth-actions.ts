/** One-off: run link building, marketing seed, and Reddit sync for a user.
 *
 * On VPS (always cd to the app first):
 *   cd /var/www/valuescan
 *   npx tsx deploy/run-growth-actions.ts admin@valuescan.online
 *
 * Or use the wrapper from anywhere:
 *   bash /var/www/valuescan/deploy/run-growth-actions.sh admin@valuescan.online
 */
import { db } from '../server/db.js'
import {
  getGrowthDashboard,
  seedLinkCampaign,
  seedMarketing,
  syncReddit,
} from '../server/lib/growth-service.js'

const email = process.argv[2] ?? 'admin@valuescan.online'

const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) as
  | { id: string; email: string; name: string }
  | undefined

if (!user) {
  console.error(`User not found: ${email}`)
  process.exit(1)
}

const site = db.prepare(
  'SELECT id, url FROM valuescan_connected_sites WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
).get(user.id) as { id: string; url: string } | undefined

if (!site) {
  console.error(`No connected site for ${email}`)
  process.exit(1)
}

console.log(`Running growth actions for ${user.email} (${site.url})…`)

const links = await seedLinkCampaign(user.id, user.email, user.name)
console.log(`Links: ${links.length} total, ${links.filter((l) => l.status === 'live').length} live`)

const campaigns = await seedMarketing(user.id, user.email)
console.log(`Campaigns: ${campaigns.length} total`)

const threads = await syncReddit(user.id)
console.log(`Reddit: ${threads.length} threads`)

const dash = getGrowthDashboard(user.id)
for (const step of dash.roadmap) {
  console.log(`  ${step.id}: ${step.status} — ${step.description}`)
}
