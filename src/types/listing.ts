export type SellerInfo = {
  name: string
  rating: number
  reviewCount: number
  location: string
  memberSince: string
  verified?: boolean
  feedbackPercent?: number
  totalSales?: number
  sellerTier?: 'standard' | 'verified' | 'elite'
}

export type Condition = 'new' | 'like-new' | 'good' | 'fair' | 'vintage' | 'digital'

export type ListingKind = 'physical' | 'digital' | 'service'

export type SaleFormat = 'fixed' | 'auction' | 'negotiable'

export type Listing = {
  id: string
  title: string
  description: string
  price: number
  originalPrice?: number
  currency: string
  category: string
  subcategory: string
  condition: Condition
  listingKind?: ListingKind
  saleFormat?: SaleFormat
  acceptsOffers?: boolean
  gameTitle?: string
  deliveryTime?: string
  unitLabel?: string
  minQuantity?: number
  image: string
  images: string[]
  seller: SellerInfo
  shipping: {
    cost: number
    free: boolean
    estimatedDays: string
  }
  digitalDelivery?: string
  auction?: {
    endsAt: string
    startingBid: number
    currentBid?: number
    bidCount?: number
    bidIncrement: number
  }
  tags: string[]
  featured: boolean
  stock: number
  listedAt: string
  views: number
  sold: number
}

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating'

export function sellerFeedbackPercent(seller: SellerInfo) {
  if (seller.feedbackPercent !== undefined) return seller.feedbackPercent
  return Math.round(seller.rating * 20 * 10) / 10
}
