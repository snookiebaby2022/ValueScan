import { db } from '../db.js'

export type FeeSettings = {
  platformFeePercent: number
  buyerProtectionPercent: number
  featuredPriceGbp: number
  featuredDays: number
  autoVerifyMinSales: number
  autoVerifyMinFeedback: number
  autoVerifyMinAccountDays: number
}

const DEFAULTS: FeeSettings = {
  platformFeePercent: 10,
  buyerProtectionPercent: 2,
  featuredPriceGbp: 9.99,
  featuredDays: 7,
  autoVerifyMinSales: 5,
  autoVerifyMinFeedback: 95,
  autoVerifyMinAccountDays: 30,
}

export function getFeeSettings(): FeeSettings {
  const rows = db.prepare('SELECT key, value FROM platform_settings').all() as { key: string; value: string }[]
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    platformFeePercent: Number(map.platform_fee_percent ?? DEFAULTS.platformFeePercent),
    buyerProtectionPercent: Number(map.buyer_protection_percent ?? DEFAULTS.buyerProtectionPercent),
    featuredPriceGbp: Number(map.featured_price_gbp ?? DEFAULTS.featuredPriceGbp),
    featuredDays: Number(map.featured_days ?? DEFAULTS.featuredDays),
    autoVerifyMinSales: Number(map.auto_verify_min_sales ?? DEFAULTS.autoVerifyMinSales),
    autoVerifyMinFeedback: Number(map.auto_verify_min_feedback ?? DEFAULTS.autoVerifyMinFeedback),
    autoVerifyMinAccountDays: Number(map.auto_verify_min_account_days ?? DEFAULTS.autoVerifyMinAccountDays),
  }
}

export function calcPlatformFee(subtotal: number, percent = getFeeSettings().platformFeePercent) {
  return Math.round(subtotal * (percent / 100) * 100) / 100
}

export function calcBuyerProtectionFee(subtotal: number, percent = getFeeSettings().buyerProtectionPercent) {
  return Math.round(subtotal * (percent / 100) * 100) / 100
}

export function gbpToPence(amount: number) {
  return Math.round(amount * 100)
}
