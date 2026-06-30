import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listings as seedListings } from '../src/data/listings.js'
import { runMigrations } from './migrate.js'
import { seedValueScanPlans } from './lib/valuescan-service.js'
import { syncValueScanAdmin } from './lib/valuescan-admin.js'
import { migrateListingImages, normalizeListingImageFields } from './lib/listing-image.js'
import { seedCategories, syncDefaultCategories } from './seed-categories.js'
import { isValueScanMode } from './config/app-mode.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, isValueScanMode() ? 'valuescan.db' : 'marketplace.db')

export type UserRow = {
  id: string
  email: string
  password_hash: string
  name: string
  role: 'buyer' | 'seller' | 'admin'
  location: string | null
  member_since: string | null
  rating: number
  review_count: number
  created_at: string
  verified?: number
  feedback_positive?: number
  feedback_total?: number
  total_sales?: number
  seller_tier?: string
}

export type ListingRow = {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  original_price: number | null
  currency: string
  category: string
  subcategory: string
  condition: string
  image: string
  images: string
  shipping_cost: number
  shipping_free: number
  shipping_days: string
  tags: string
  featured: number
  stock: number
  listed_at: string
  views: number
  sold: number
  listing_kind?: string
  sale_format?: string
  accepts_offers?: number
  auction_ends_at?: string | null
  starting_bid?: number | null
  current_bid?: number | null
  bid_count?: number
  bid_increment?: number
  digital_delivery?: string | null
  game_title?: string | null
  delivery_time?: string | null
  unit_label?: string | null
  min_quantity?: number
}

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'buyer',
      location TEXT,
      member_since TEXT,
      rating REAL DEFAULT 5.0,
      review_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      currency TEXT DEFAULT 'GBP',
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      condition TEXT NOT NULL,
      image TEXT NOT NULL,
      images TEXT NOT NULL,
      shipping_cost REAL DEFAULT 0,
      shipping_free INTEGER DEFAULT 0,
      shipping_days TEXT,
      tags TEXT NOT NULL,
      featured INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 1,
      listed_at TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      sold INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'paid',
      subtotal REAL NOT NULL,
      shipping_total REAL NOT NULL,
      total REAL NOT NULL,
      shipping_name TEXT NOT NULL,
      shipping_line1 TEXT NOT NULL,
      shipping_line2 TEXT,
      shipping_city TEXT NOT NULL,
      shipping_state TEXT NOT NULL,
      shipping_zip TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      listing_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      title TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      shipping_cost REAL NOT NULL
    );
  `)

  runMigrations(db)
  seedValueScanPlans()

  if (isValueScanMode()) {
    syncValueScanAdmin()
    return
  }

  seedCategories(db)
  migrateListingImages(db)

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (count.c === 0) seedDatabase()
  else {
    syncMissingListings()
    syncExistingSellers()
    ensureAdminUser()
    syncDefaultCategories(db)
  }
}

function ensureAdminUser() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.com')
  if (existing) return
  const hash = bcrypt.hashSync('demo123', 10)
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, location, member_since, rating, review_count,
      verified, feedback_positive, feedback_total, total_sales, seller_tier, created_at)
     VALUES (?, ?, ?, ?, 'admin', 'London, UK', '2020', 5.0, 0, 1, 0, 0, 0, 'elite', ?)`,
  ).run(crypto.randomUUID(), 'admin@demo.com', hash, 'Site Admin', now)
}

function syncExistingSellers() {
  db.prepare(`UPDATE users SET verified = 1, seller_tier = COALESCE(seller_tier, 'verified')
    WHERE role = 'seller' AND (verified IS NULL OR verified = 0)`).run()
  db.prepare(`UPDATE users SET feedback_positive = CAST(review_count * (rating / 5.0) AS INTEGER),
    feedback_total = CASE WHEN feedback_total = 0 OR feedback_total IS NULL THEN review_count ELSE feedback_total END,
    total_sales = CASE WHEN total_sales = 0 OR total_sales IS NULL THEN review_count ELSE total_sales END
    WHERE role = 'seller' AND review_count > 0 AND (feedback_total IS NULL OR feedback_total = 0)`).run()
}

type SeedListing = (typeof seedListings)[number] & {
  listingKind?: string
  saleFormat?: string
  acceptsOffers?: boolean
  digitalDelivery?: string
  gameTitle?: string
  deliveryTime?: string
  unitLabel?: string
  minQuantity?: number
  auction?: { endsAt: string; startingBid: number; bidIncrement?: number }
}

const GAME_CATS = new Set(['game-currency', 'game-accounts', 'in-game-items', 'game-keys', 'gift-cards', 'game-boosting'])

function insertListingRow(sid: string, listing: SeedListing) {
  const kind = listing.listingKind ?? (GAME_CATS.has(listing.category) || listing.category.includes('app') || listing.category === 'domain-names' || listing.category === 'websites' ? 'digital' : 'physical')
  const saleFormat = listing.saleFormat ?? 'fixed'
  const isDigital = kind === 'digital'
  const price = saleFormat === 'auction' && listing.auction?.startingBid ? listing.auction.startingBid : listing.price

  const images = normalizeListingImageFields(listing.id, listing.image, JSON.stringify(listing.images))

  db.prepare(
    `INSERT INTO listings (id, seller_id, title, description, price, original_price, currency, category, subcategory, condition,
      image, images, shipping_cost, shipping_free, shipping_days, tags, featured, stock, listed_at, views, sold,
      listing_kind, sale_format, accepts_offers, auction_ends_at, starting_bid, current_bid, bid_count, bid_increment, digital_delivery,
      game_title, delivery_time, unit_label, min_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    listing.id, sid, listing.title, listing.description, price, listing.originalPrice ?? null,
    listing.currency ?? 'GBP', listing.category, listing.subcategory, listing.condition, images.image,
    images.images, isDigital ? 0 : listing.shipping.cost, isDigital ? 1 : (listing.shipping.free ? 1 : 0),
    isDigital ? (listing.deliveryTime ?? 'Instant delivery') : listing.shipping.estimatedDays, JSON.stringify(listing.tags),
    listing.featured ? 1 : 0, listing.stock, listing.listedAt, listing.views, listing.sold,
    kind, saleFormat, listing.acceptsOffers ? 1 : 0,
    listing.auction?.endsAt ?? null, listing.auction?.startingBid ?? null,
    listing.auction?.startingBid ?? null, 0, listing.auction?.bidIncrement ?? 1,
    listing.digitalDelivery ?? null,
    listing.gameTitle ?? null, listing.deliveryTime ?? null, listing.unitLabel ?? null, listing.minQuantity ?? 1,
  )
}

function sellerFeedbackFromSeed(seller: SeedListing['seller']) {
  const pct = seller.feedbackPercent ?? Math.round(seller.rating * 20 * 10) / 10
  const total = seller.reviewCount
  const positive = seller.feedbackPercent !== undefined
    ? Math.round(total * (seller.feedbackPercent / 100))
    : Math.round(total * (seller.rating / 5))
  return { pct, positive, total, sales: seller.totalSales ?? total }
}

function ensureSeller(sellerMap: Map<string, string>, seller: SeedListing['seller'], hash: string, now: string) {
  let sid = sellerMap.get(seller.name)
  const fb = sellerFeedbackFromSeed(seller)
  const tier = seller.sellerTier ?? (fb.pct >= 99 ? 'elite' : 'verified')
  if (!sid) {
    sid = crypto.randomUUID()
    const slug = seller.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, location, member_since, rating, review_count,
        verified, feedback_positive, feedback_total, total_sales, seller_tier, created_at)
       VALUES (?, ?, ?, ?, 'seller', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    ).run(sid, `${slug}@marketplace.demo`, hash, seller.name, seller.location, seller.memberSince,
      seller.rating, seller.reviewCount, fb.positive, fb.total, fb.sales, tier, now)
    sellerMap.set(seller.name, sid)
  } else {
    db.prepare(
      `UPDATE users SET verified = 1, feedback_positive = ?, feedback_total = ?, total_sales = ?, seller_tier = ? WHERE id = ?`,
    ).run(fb.positive, fb.total, fb.sales, tier, sid)
  }
  return sid
}

function syncMissingListings() {
  const hash = bcrypt.hashSync('demo123', 10)
  const now = new Date().toISOString()
  const sellerMap = new Map<string, string>()
  for (const s of db.prepare('SELECT id, name FROM users WHERE role = ?').all('seller') as { id: string; name: string }[]) {
    sellerMap.set(s.name, s.id)
  }
  const exists = db.prepare('SELECT id FROM listings WHERE id = ?')
  for (const listing of seedListings) {
    if (exists.get(listing.id)) continue
    const sid = ensureSeller(sellerMap, listing.seller, hash, now)
    insertListingRow(sid, listing as SeedListing)
  }
}

function seedDatabase() {
  const hash = bcrypt.hashSync('demo123', 10)
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, location, member_since, rating, review_count, created_at)
     VALUES (?, ?, ?, ?, 'buyer', 'London, UK', '2024', 5.0, 12, ?)`,
  ).run(crypto.randomUUID(), 'buyer@demo.com', hash, 'Demo Buyer', now)

  const sellerId = crypto.randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, location, member_since, rating, review_count,
      verified, feedback_positive, feedback_total, total_sales, seller_tier, created_at)
     VALUES (?, ?, ?, ?, 'seller', 'Manchester, UK', '2019', 4.9, 1247, 1, 1234, 1247, 1247, 'elite', ?)`,
  ).run(sellerId, 'seller@demo.com', hash, 'Demo Seller', now)

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, location, member_since, rating, review_count,
      verified, feedback_positive, feedback_total, total_sales, seller_tier, created_at)
     VALUES (?, ?, ?, ?, 'admin', 'London, UK', '2020', 5.0, 0, 1, 0, 0, 0, 'elite', ?)`,
  ).run(crypto.randomUUID(), 'admin@demo.com', hash, 'Site Admin', now)

  const sellerMap = new Map<string, string>([['Demo Seller', sellerId]])
  for (const listing of seedListings) {
    const sid = ensureSeller(sellerMap, listing.seller, hash, now)
    insertListingRow(sid, listing as SeedListing)
  }
}

export function rowToSeller(seller: UserRow) {
  const total = seller.feedback_total ?? seller.review_count ?? 0
  const positive = seller.feedback_positive ?? Math.round(total * (seller.rating / 5))
  const pct = total > 0 ? Math.round((positive / total) * 1000) / 10 : Math.round(seller.rating * 20 * 10) / 10
  return {
    id: seller.id,
    name: seller.name,
    rating: seller.rating,
    reviewCount: seller.review_count,
    location: seller.location ?? '',
    memberSince: seller.member_since ?? '',
    verified: seller.role === 'seller' ? (seller.verified ?? 1) === 1 : false,
    feedbackPercent: pct,
    totalSales: seller.total_sales ?? seller.review_count,
    sellerTier: (seller.seller_tier ?? 'verified') as 'standard' | 'verified' | 'elite',
  }
}

export function rowToListing(row: ListingRow, seller: UserRow) {
  const kind = row.listing_kind ?? 'physical'
  const saleFormat = row.sale_format ?? 'fixed'
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    currency: row.currency ?? 'GBP',
    category: row.category,
    subcategory: row.subcategory,
    condition: row.condition,
    listingKind: kind as 'physical' | 'digital' | 'service',
    saleFormat: saleFormat as 'fixed' | 'auction' | 'negotiable',
    acceptsOffers: row.accepts_offers === 1,
    gameTitle: row.game_title ?? undefined,
    deliveryTime: row.delivery_time ?? undefined,
    unitLabel: row.unit_label ?? undefined,
    minQuantity: row.min_quantity ?? 1,
    image: row.image,
    images: JSON.parse(row.images) as string[],
    seller: rowToSeller(seller),
    shipping: {
      cost: row.shipping_cost,
      free: row.shipping_free === 1 || kind === 'digital',
      estimatedDays: row.shipping_days,
    },
    digitalDelivery: row.digital_delivery ?? undefined,
    auction: saleFormat === 'auction' ? {
      endsAt: row.auction_ends_at ?? '',
      startingBid: row.starting_bid ?? row.price,
      currentBid: row.current_bid ?? row.starting_bid ?? row.price,
      bidCount: row.bid_count ?? 0,
      bidIncrement: row.bid_increment ?? 1,
    } : undefined,
    tags: JSON.parse(row.tags) as string[],
    featured: row.featured === 1,
    stock: row.stock,
    listedAt: row.listed_at,
    views: row.views,
    sold: row.sold,
  }
}

export function getListingWithSeller(id: string) {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as ListingRow | undefined
  if (!row) return null
  const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(row.seller_id) as UserRow
  return rowToListing(row, seller)
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    location: user.location,
    memberSince: user.member_since,
    rating: user.rating,
    reviewCount: user.review_count,
  }
}

export function calcVat(subtotal: number) {
  return Math.round(subtotal * 0.2 * 100) / 100
}
