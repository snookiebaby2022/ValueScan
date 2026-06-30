import type Database from 'better-sqlite3'
import { syncDefaultCategories } from './seed-categories.js'
import { syncValueScanPlanFeatures } from './lib/valuescan-service.js'
import { syncValueScanAdmin } from './lib/valuescan-admin.js'

type Db = Database.Database

function hasColumn(db: Db, table: string, column: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return cols.some((c) => c.name === column)
}

function addColumn(db: Db, table: string, ddl: string) {
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

export function runMigrations(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#64748B',
      kind TEXT DEFAULT 'physical',
      subcategories TEXT NOT NULL DEFAULT '[]',
      custom INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      bidder_id TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS digital_deliveries (
      id TEXT PRIMARY KEY,
      order_item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      delivery_note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  const listingCols: [string, string][] = [
    ['listing_kind', "TEXT DEFAULT 'physical'"],
    ['sale_format', "TEXT DEFAULT 'fixed'"],
    ['accepts_offers', 'INTEGER DEFAULT 0'],
    ['auction_ends_at', 'TEXT'],
    ['starting_bid', 'REAL'],
    ['current_bid', 'REAL'],
    ['bid_count', 'INTEGER DEFAULT 0'],
    ['bid_increment', 'REAL DEFAULT 1'],
    ['digital_delivery', 'TEXT'],
  ]
  for (const [col, ddl] of listingCols) {
    if (!hasColumn(db, 'listings', col)) addColumn(db, 'listings', `${col} ${ddl}`)
  }

  const orderCols: [string, string][] = [
    ['payment_method', 'TEXT DEFAULT \'card\''],
    ['shipping_county', 'TEXT'],
    ['shipping_postcode', 'TEXT'],
    ['vat_amount', 'REAL DEFAULT 0'],
    ['currency', "TEXT DEFAULT 'GBP'"],
  ]
  for (const [col, ddl] of orderCols) {
    if (!hasColumn(db, 'orders', col)) addColumn(db, 'orders', `${col} ${ddl}`)
  }

  if (!db.prepare(`SELECT 1 FROM sqlite_master WHERE name = 'schema_version'`).get()) {
    db.exec(`CREATE TABLE schema_version (version INTEGER NOT NULL)`)
    db.prepare(`INSERT INTO schema_version (version) VALUES (0)`).run()
  }

  const { version } = db.prepare('SELECT version FROM schema_version').get() as { version: number }
  if (version < 1) {
    db.prepare(`UPDATE listings SET currency = 'GBP', price = ROUND(price * 0.79, 2),
      original_price = CASE WHEN original_price IS NOT NULL THEN ROUND(original_price * 0.79, 2) ELSE NULL END
      WHERE currency = 'USD'`).run()
    db.prepare(`UPDATE listings SET shipping_cost = ROUND(shipping_cost * 0.79, 2) WHERE shipping_cost > 0`).run()
    db.prepare('UPDATE schema_version SET version = 1').run()
  }

  const userCols: [string, string][] = [
    ['verified', 'INTEGER DEFAULT 0'],
    ['feedback_positive', 'INTEGER DEFAULT 0'],
    ['feedback_total', 'INTEGER DEFAULT 0'],
    ['total_sales', 'INTEGER DEFAULT 0'],
    ['seller_tier', "TEXT DEFAULT 'standard'"],
  ]
  for (const [col, ddl] of userCols) {
    if (!hasColumn(db, 'users', col)) addColumn(db, 'users', `${col} ${ddl}`)
  }

  const gameListingCols: [string, string][] = [
    ['game_title', 'TEXT'],
    ['delivery_time', 'TEXT'],
    ['unit_label', 'TEXT'],
    ['min_quantity', 'INTEGER DEFAULT 1'],
  ]
  for (const [col, ddl] of gameListingCols) {
    if (!hasColumn(db, 'listings', col)) addColumn(db, 'listings', `${col} ${ddl}`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS seller_reviews (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL REFERENCES users(id),
      buyer_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL
    );
  `)

  if (version < 2) {
    db.prepare(`UPDATE users SET verified = 1, seller_tier = 'verified'
      WHERE role IN ('seller', 'admin') AND (verified IS NULL OR verified = 0)`).run()
    db.prepare(`UPDATE users SET feedback_positive = CAST(review_count * (rating / 5.0) AS INTEGER),
      feedback_total = review_count, total_sales = review_count
      WHERE role = 'seller' AND feedback_total = 0 AND review_count > 0`).run()
    db.prepare('UPDATE schema_version SET version = 2').run()
  }

  if (version < 3) {
    syncDefaultCategories(db)
    db.prepare('UPDATE schema_version SET version = 3').run()
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seller_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      legal_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      country TEXT DEFAULT 'UK',
      business_type TEXT DEFAULT 'individual',
      id_doc_path TEXT,
      selfie_path TEXT,
      business_doc_path TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS featured_purchases (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      seller_id TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      days INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      stripe_session_id TEXT,
      featured_until TEXT,
      created_at TEXT NOT NULL
    );
  `)

  const orderFeeCols: [string, string][] = [
    ['platform_fee', 'REAL DEFAULT 0'],
    ['buyer_protection_fee', 'REAL DEFAULT 0'],
    ['stripe_session_id', 'TEXT'],
    ['stripe_payment_intent_id', 'TEXT'],
  ]
  for (const [col, ddl] of orderFeeCols) {
    if (!hasColumn(db, 'orders', col)) addColumn(db, 'orders', `${col} ${ddl}`)
  }

  const orderItemCols: [string, string][] = [
    ['platform_fee', 'REAL DEFAULT 0'],
    ['seller_payout', 'REAL DEFAULT 0'],
  ]
  for (const [col, ddl] of orderItemCols) {
    if (!hasColumn(db, 'order_items', col)) addColumn(db, 'order_items', `${col} ${ddl}`)
  }

  const userStripeCols: [string, string][] = [
    ['stripe_account_id', 'TEXT'],
    ['stripe_onboarded', 'INTEGER DEFAULT 0'],
    ['phone', 'TEXT'],
  ]
  for (const [col, ddl] of userStripeCols) {
    if (!hasColumn(db, 'users', col)) addColumn(db, 'users', `${col} ${ddl}`)
  }

  if (!hasColumn(db, 'listings', 'featured_until')) {
    addColumn(db, 'listings', 'featured_until TEXT')
  }

  const settingsSeed: [string, string][] = [
    ['platform_fee_percent', '10'],
    ['buyer_protection_percent', '2'],
    ['featured_price_gbp', '9.99'],
    ['featured_days', '7'],
    ['auto_verify_min_sales', '5'],
    ['auto_verify_min_feedback', '95'],
    ['auto_verify_min_account_days', '30'],
  ]
  const insSetting = db.prepare('INSERT OR IGNORE INTO platform_settings (key, value) VALUES (?, ?)')
  for (const [k, v] of settingsSeed) insSetting.run(k, v)

  const whmcsCols: [string, string, string][] = [
    ['orders', 'whmcs_invoice_id', 'INTEGER'],
    ['users', 'whmcs_client_id', 'INTEGER'],
    ['featured_purchases', 'whmcs_invoice_id', 'INTEGER'],
  ]
  for (const [table, col, ddl] of whmcsCols) {
    if (!hasColumn(db, table, col)) addColumn(db, table, `${col} ${ddl}`)
  }

  if (version < 4) {
    db.prepare('UPDATE schema_version SET version = 4').run()
  }

  if (version < 5) {
    db.prepare('UPDATE schema_version SET version = 5').run()
  }

  if (version < 6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_scans (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        final_url TEXT NOT NULL,
        overall_score INTEGER NOT NULL,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_scans_created ON audit_scans(created_at DESC);
    `)
    db.prepare('UPDATE schema_version SET version = 6').run()
  }

  if (version < 7) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        price_gbp REAL NOT NULL DEFAULT 0,
        scans_per_day INTEGER NOT NULL DEFAULT 5,
        features TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES valuescan_plans(id),
        status TEXT NOT NULL DEFAULT 'active',
        started_at TEXT NOT NULL,
        expires_at TEXT,
        assigned_by TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vs_subs_user ON valuescan_subscriptions(user_id, status);
    `)

    if (!hasColumn(db, 'audit_scans', 'user_id')) addColumn(db, 'audit_scans', 'user_id TEXT REFERENCES users(id)')
    if (!hasColumn(db, 'audit_scans', 'client_ip')) addColumn(db, 'audit_scans', 'client_ip TEXT')
    if (!hasColumn(db, 'audit_scans', 'plan_slug')) addColumn(db, 'audit_scans', 'plan_slug TEXT DEFAULT \'free\'')

    db.prepare('UPDATE schema_version SET version = 7').run()
  }

  if (version < 8) {
    syncValueScanPlanFeatures()
    db.prepare('UPDATE schema_version SET version = 8').run()
  }

  if (version < 9) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS valuescan_monitors (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        label TEXT NOT NULL,
        alert_email TEXT,
        alert_threshold INTEGER NOT NULL DEFAULT 10,
        webhook_url TEXT,
        interval_hours INTEGER NOT NULL DEFAULT 24,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_score INTEGER,
        previous_score INTEGER,
        last_scan_id TEXT,
        last_checked_at TEXT,
        next_check_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_team_members (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_branding (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        company_name TEXT NOT NULL DEFAULT '',
        logo_url TEXT NOT NULL DEFAULT '',
        hide_valuescan INTEGER NOT NULL DEFAULT 0,
        accent_color TEXT NOT NULL DEFAULT '#6366f1',
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vs_monitors_next ON valuescan_monitors(next_check_at);
      CREATE INDEX IF NOT EXISTS idx_audit_scans_user ON audit_scans(user_id, created_at DESC);
    `)
    syncValueScanPlanFeatures()
    db.prepare('UPDATE schema_version SET version = 9').run()
  }

  if (version < 10) {
    if (!hasColumn(db, 'valuescan_subscriptions', 'stripe_subscription_id')) {
      addColumn(db, 'valuescan_subscriptions', 'stripe_subscription_id TEXT')
    }
    if (!hasColumn(db, 'valuescan_subscriptions', 'stripe_customer_id')) {
      addColumn(db, 'valuescan_subscriptions', 'stripe_customer_id TEXT')
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_team_invites (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        onboarding_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vs_invites_token ON valuescan_team_invites(token);
    `)
    db.prepare('UPDATE schema_version SET version = 10').run()
  }

  if (version < 11) {
    if (!hasColumn(db, 'valuescan_subscriptions', 'expires_at')) {
      addColumn(db, 'valuescan_subscriptions', 'expires_at TEXT')
    }
    if (!hasColumn(db, 'valuescan_subscriptions', 'billing_provider')) {
      addColumn(db, 'valuescan_subscriptions', 'billing_provider TEXT')
    }
    if (!hasColumn(db, 'valuescan_subscriptions', 'whmcs_invoice_id')) {
      addColumn(db, 'valuescan_subscriptions', 'whmcs_invoice_id INTEGER')
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_billing_pending (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_slug TEXT NOT NULL,
        whmcs_invoice_id INTEGER NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        paid_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_vs_billing_pending_user ON valuescan_billing_pending(user_id, status);
    `)
    db.prepare('UPDATE schema_version SET version = 11').run()
  }

  if (version < 12) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_connected_sites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        label TEXT NOT NULL,
        autopilot_enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_content_articles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        target_keyword TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        word_count INTEGER NOT NULL DEFAULT 0,
        seo_score INTEGER NOT NULL DEFAULT 0,
        published_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_link_outreach (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        target_domain TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'prospect',
        anchor TEXT NOT NULL,
        domain_rating INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_vs_sites_user_url ON valuescan_connected_sites(user_id, url);
      CREATE INDEX IF NOT EXISTS idx_vs_articles_user ON valuescan_content_articles(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vs_links_user ON valuescan_link_outreach(user_id, updated_at DESC);
    `)
    syncValueScanPlanFeatures()
    db.prepare('UPDATE schema_version SET version = 12').run()
  }

  if (version < 13) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_keywords (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        difficulty INTEGER NOT NULL DEFAULT 50,
        volume INTEGER NOT NULL DEFAULT 0,
        win_score INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_llm_snapshots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        engine TEXT NOT NULL,
        score INTEGER NOT NULL,
        mentions INTEGER NOT NULL DEFAULT 0,
        signals_json TEXT NOT NULL DEFAULT '[]',
        checked_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_reddit_threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        subreddit TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        fit_score INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'new',
        discovered_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS valuescan_autopilot_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vs_keywords_site ON valuescan_keywords(site_id, win_score DESC);
      CREATE INDEX IF NOT EXISTS idx_vs_llm_site_engine ON valuescan_llm_snapshots(site_id, engine, checked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vs_reddit_site ON valuescan_reddit_threads(site_id, fit_score DESC);
    `)

    const articleCols: [string, string][] = [
      ['slug', 'TEXT'],
      ['body_html', 'TEXT'],
      ['publish_url', 'TEXT'],
      ['scheduled_at', 'TEXT'],
    ]
    for (const [col, type] of articleCols) {
      if (!hasColumn(db, 'valuescan_content_articles', col)) {
        addColumn(db, 'valuescan_content_articles', `${col} ${type}`)
      }
    }

    const linkCols: [string, string][] = [
      ['target_url', 'TEXT'],
      ['contact_email', 'TEXT'],
      ['outreach_sent_at', 'TEXT'],
      ['link_type', "TEXT DEFAULT 'outreach'"],
      ['notes', 'TEXT'],
    ]
    for (const [col, ddl] of linkCols) {
      if (!hasColumn(db, 'valuescan_link_outreach', col)) {
        addColumn(db, 'valuescan_link_outreach', `${col} ${ddl}`)
      }
    }

    const siteCols: [string, string][] = [
      ['last_autopilot_at', 'TEXT'],
      ['next_autopilot_at', 'TEXT'],
      ['last_growth_run_at', 'TEXT'],
      ['next_growth_run_at', 'TEXT'],
      ['cms_webhook_url', 'TEXT'],
      ['last_scan_at', 'TEXT'],
    ]
    for (const [col, ddl] of siteCols) {
      if (!hasColumn(db, 'valuescan_connected_sites', col)) {
        addColumn(db, 'valuescan_connected_sites', `${col} ${ddl}`)
      }
    }

    db.exec(`CREATE INDEX IF NOT EXISTS idx_vs_autopilot_next ON valuescan_connected_sites(autopilot_enabled, next_autopilot_at)`)

    db.prepare('UPDATE schema_version SET version = 13').run()
  }

  if (version < 14) {
    syncValueScanPlanFeatures()
    db.prepare('UPDATE schema_version SET version = 14').run()
  }

  if (version < 15) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_marketing_campaigns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        headline TEXT NOT NULL,
        body TEXT NOT NULL,
        cta_url TEXT NOT NULL,
        target_keyword TEXT,
        scheduled_at TEXT,
        launched_at TEXT,
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_vs_marketing_site ON valuescan_marketing_campaigns(site_id, status, updated_at DESC);
    `)
    syncValueScanPlanFeatures()
    db.prepare('UPDATE schema_version SET version = 15').run()
  }

  if (version < 16) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        admin_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_vs_support_status ON valuescan_support_tickets(status, created_at DESC);
    `)
    db.prepare('UPDATE schema_version SET version = 16').run()
  }

  if (version < 17) {
    syncValueScanAdmin()
    db.prepare('UPDATE schema_version SET version = 17').run()
  }

  if (version < 18) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS valuescan_backlink_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        site_id TEXT NOT NULL REFERENCES valuescan_connected_sites(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        site_url TEXT NOT NULL,
        body_html TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        published_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_vs_backlink_profiles_site ON valuescan_backlink_profiles(site_id);
    `)
    for (const col of ['live_url', 'source_url']) {
      if (!hasColumn(db, 'valuescan_link_outreach', col)) {
        addColumn(db, 'valuescan_link_outreach', `${col} TEXT`)
      }
    }
    db.prepare('UPDATE schema_version SET version = 18').run()
  }
}
