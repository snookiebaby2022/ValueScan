/** Server-side listing image URLs — keep in sync with src/utils/listing-image.ts */
export function listingImageUrl(listingId: string, size = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(listingId)}/${size}/${size}`
}

export function listingImages(listingId: string): string[] {
  return [listingImageUrl(listingId, 800), listingImageUrl(listingId, 600)]
}

export function normalizeListingImageFields(id: string, image?: string, imagesJson?: string): {
  image: string
  images: string
} {
  const primary = listingImageUrl(id)
  const gallery = listingImages(id)
  // Replace dead Unsplash links or empty values
  if (!image?.trim() || image.includes('images.unsplash.com')) {
    return { image: primary, images: JSON.stringify(gallery) }
  }
  try {
    const parsed = JSON.parse(imagesJson ?? '[]') as string[]
    if (parsed.some((u) => u.includes('images.unsplash.com'))) {
      return { image: primary, images: JSON.stringify(gallery) }
    }
  } catch {
    return { image: primary, images: JSON.stringify(gallery) }
  }
  return { image, images: imagesJson ?? JSON.stringify(gallery) }
}

export function migrateListingImages(db: { prepare: (sql: string) => { all: () => Array<{ id: string; image: string; images: string }>; run: (...args: unknown[]) => void } }) {
  const rows = db.prepare('SELECT id, image, images FROM listings').all()
  const update = db.prepare('UPDATE listings SET image = ?, images = ? WHERE id = ?')
  let fixed = 0
  for (const row of rows) {
    const next = normalizeListingImageFields(row.id, row.image, row.images)
    if (next.image !== row.image || next.images !== row.images) {
      update.run(next.image, next.images, row.id)
      fixed++
    }
  }
  if (fixed > 0) console.log(`Fixed ${fixed} listing image URL(s)`)
}
