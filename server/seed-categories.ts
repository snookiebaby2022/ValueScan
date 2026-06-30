import type Database from 'better-sqlite3'

type Db = Database.Database

export const defaultCategories = [
  // ── Gaming ──
  { id: 'game-currency', name: 'Game Currency', icon: '🪙', color: '#EAB308', kind: 'digital', subcategories: ['OSRS Gold', 'WoW Gold', 'FIFA Coins', 'Roblox Robux', 'GTA Money', 'Diablo Gold', 'Lost Ark Gold', 'Other Currencies'] },
  { id: 'game-accounts', name: 'Game Accounts', icon: '🎮', color: '#7C3AED', kind: 'digital', subcategories: ['Fortnite', 'Valorant', 'League of Legends', 'Call of Duty', 'Genshin Impact', 'Minecraft', 'Clash of Clans', 'Other Accounts'] },
  { id: 'in-game-items', name: 'In-Game Items', icon: '⚔️', color: '#EF4444', kind: 'digital', subcategories: ['Skins', 'Weapons', 'Pets', 'Cosmetics', 'Rare Items', 'Bundles', 'Mounts', 'Emotes'] },
  { id: 'game-boosting', name: 'Boosting & Coaching', icon: '🚀', color: '#F97316', kind: 'service', subcategories: ['Rank Boost', 'Leveling', 'Coaching', 'Carries', 'Achievements', 'Power Leveling', 'Raids', 'Placement Matches'] },
  { id: 'game-keys', name: 'Game Keys & DLC', icon: '🔑', color: '#06B6D4', kind: 'digital', subcategories: ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'PC', 'Epic Games', 'DLC & Expansions', 'Season Passes'] },
  { id: 'gift-cards', name: 'Gift Cards', icon: '🎁', color: '#EC4899', kind: 'digital', subcategories: ['Steam', 'PlayStation', 'Xbox', 'Nintendo', 'Amazon', 'Google Play', 'Apple iTunes', 'Other Gift Cards'] },

  // ── Digital assets ──
  { id: 'websites', name: 'Websites', icon: '🌐', color: '#0EA5E9', kind: 'digital', subcategories: ['E-commerce', 'Blogs', 'SaaS', 'Landing Pages', 'Portfolios', 'Forums', 'Directories', 'Membership Sites'] },
  { id: 'domain-names', name: 'Domain Names', icon: '🔗', color: '#8B5CF6', kind: 'digital', subcategories: ['.xyz', '.co.uk', '.com', '.io', '.net', 'Premium', 'Brandable', 'Expired'] },
  { id: 'android-apps', name: 'Android Apps', icon: '🤖', color: '#22C55E', kind: 'digital', subcategories: ['Games', 'Utilities', 'Source Code', 'Licences', 'Templates', 'Publishing Ready', 'Flipped Apps', 'Reskin Kits'] },
  { id: 'ios-apps', name: 'iOS Apps', icon: '📱', color: '#1D4ED8', kind: 'digital', subcategories: ['Games', 'Utilities', 'Source Code', 'Licences', 'Templates', 'App Store Ready', 'Flipped Apps', 'Reskin Kits'] },
  { id: 'software-licenses', name: 'Software & Licences', icon: '💿', color: '#6366F1', kind: 'digital', subcategories: ['Windows', 'Office', 'Adobe', 'Antivirus', 'VPN', 'Developer Tools', 'CAD & Design', 'Server Licences'] },
  { id: 'saas-subscriptions', name: 'SaaS & Subscriptions', icon: '☁️', color: '#0284C7', kind: 'digital', subcategories: ['Streaming', 'Cloud Storage', 'Design Tools', 'SEO Tools', 'Hosting', 'Email Marketing', 'CRM', 'Other Subscriptions'] },
  { id: 'digital-art', name: 'Digital Art & Assets', icon: '🎨', color: '#A855F7', kind: 'digital', subcategories: ['Stock Photos', 'Vectors', '3D Models', 'Fonts', 'UI Kits', 'Icons', 'Video Templates', 'Sound Effects'] },
  { id: 'ebooks-audio', name: 'eBooks & Audiobooks', icon: '📖', color: '#854D0E', kind: 'digital', subcategories: ['Fiction', 'Non-Fiction', 'Textbooks', 'Comics Digital', 'Audiobooks', 'Magazines Digital', 'Planners', 'Guides & Manuals'] },
  { id: 'nft-crypto', name: 'NFT & Crypto', icon: '⛓️', color: '#F59E0B', kind: 'digital', subcategories: ['NFT Art', 'NFT Gaming', 'Crypto Accounts', 'Mining Gear', 'Wallets & Keys', 'Tokens', 'Domains Web3', 'Other Crypto'] },

  // ── Electronics & tech ──
  { id: 'electronics', name: 'Electronics', icon: '💻', color: '#3B82F6', kind: 'physical', subcategories: ['Phones', 'Laptops', 'Tablets', 'Cameras', 'Audio', 'Gaming Consoles', 'Smart Home', 'Wearables'] },
  { id: 'computers', name: 'Computers & Components', icon: '🖥️', color: '#2563EB', kind: 'physical', subcategories: ['Desktops', 'Laptops', 'GPUs', 'CPUs', 'RAM', 'Storage', 'Monitors', 'Peripherals'] },
  { id: 'phones-tablets', name: 'Phones & Tablets', icon: '📲', color: '#0D9488', kind: 'physical', subcategories: ['iPhone', 'Samsung', 'Google Pixel', 'iPad', 'Android Tablets', 'Accessories', 'Cases', 'Chargers & Cables'] },
  { id: 'gaming-hardware', name: 'Gaming Hardware', icon: '🕹️', color: '#DC2626', kind: 'physical', subcategories: ['Consoles', 'Controllers', 'Headsets', 'Gaming Chairs', 'Keyboards', 'Mice', 'VR Headsets', 'Streaming Gear'] },
  { id: 'cameras-photo', name: 'Cameras & Photography', icon: '📷', color: '#475569', kind: 'physical', subcategories: ['DSLR', 'Mirrorless', 'Lenses', 'Action Cameras', 'Drones', 'Lighting', 'Tripods', 'Film & Darkroom'] },
  { id: 'audio-hifi', name: 'Audio & Hi-Fi', icon: '🎧', color: '#7C3AED', kind: 'physical', subcategories: ['Headphones', 'Speakers', 'Turntables', 'Amplifiers', 'Microphones', 'DACs', 'Studio Monitors', 'Cables'] },
  { id: 'networking', name: 'Networking & Smart Home', icon: '📡', color: '#0891B2', kind: 'physical', subcategories: ['Routers', 'Mesh Wi-Fi', 'NAS', 'Smart Lights', 'Security Cameras', 'Smart Plugs', 'Hubs', 'Cables & Adapters'] },

  // ── Fashion & beauty ──
  { id: 'fashion', name: 'Fashion', icon: '👗', color: '#EC4899', kind: 'physical', subcategories: ['Women', 'Men', 'Unisex', 'Plus Size', 'Maternity', 'Formal Wear', 'Activewear', 'Loungewear'] },
  { id: 'shoes', name: 'Shoes & Footwear', icon: '👟', color: '#DB2777', kind: 'physical', subcategories: ['Trainers', 'Boots', 'Heels', 'Sandals', 'Slippers', 'Kids Shoes', 'Designer', 'Vintage Footwear'] },
  { id: 'accessories', name: 'Accessories', icon: '👜', color: '#BE185D', kind: 'physical', subcategories: ['Handbags', 'Belts', 'Hats', 'Scarves', 'Sunglasses', 'Wallets', 'Ties', 'Hair Accessories'] },
  { id: 'vintage-fashion', name: 'Vintage & Designer', icon: '✨', color: '#9333EA', kind: 'physical', subcategories: ['Designer Bags', 'Vintage Clothing', 'Luxury Watches', 'Archive Pieces', 'Streetwear Grails', 'Limited Editions', 'Consignment', 'Authentication Services'] },
  { id: 'beauty', name: 'Beauty & Makeup', icon: '💄', color: '#DB2777', kind: 'physical', subcategories: ['Skincare', 'Makeup', 'Fragrance', 'Hair Care', 'Nails', 'Tools & Brushes', 'K-Beauty', 'Clean Beauty'] },
  { id: 'jewelry', name: 'Jewellery & Watches', icon: '💎', color: '#0891B2', kind: 'physical', subcategories: ['Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Watches', 'Fine Jewellery', 'Costume Jewellery', 'Smartwatches'] },

  // ── Home & garden ──
  { id: 'home', name: 'Home & Garden', icon: '🏠', color: '#059669', kind: 'physical', subcategories: ['Furniture', 'Decor', 'Kitchen', 'Garden', 'Tools', 'Lighting', 'Bedding', 'Storage'] },
  { id: 'furniture', name: 'Furniture', icon: '🛋️', color: '#047857', kind: 'physical', subcategories: ['Sofas', 'Beds', 'Desks', 'Dining Sets', 'Office Furniture', 'Outdoor Furniture', 'Kids Furniture', 'Antique Furniture'] },
  { id: 'kitchen-dining', name: 'Kitchen & Dining', icon: '🍳', color: '#B45309', kind: 'physical', subcategories: ['Cookware', 'Appliances', 'Tableware', 'Knives', 'Storage Jars', 'Coffee Makers', 'Barware', 'Small Appliances'] },
  { id: 'garden-outdoor', name: 'Garden & Outdoor', icon: '🌿', color: '#16A34A', kind: 'physical', subcategories: ['Plants', 'Tools', 'Furniture', 'BBQ & Grills', 'Sheds', 'Lawn Care', 'Patio', 'Greenhouses'] },
  { id: 'home-improvement', name: 'Home Improvement', icon: '🔧', color: '#78716C', kind: 'physical', subcategories: ['Power Tools', 'Hand Tools', 'Paint', 'Flooring', 'Plumbing', 'Electrical', 'Hardware', 'Safety Equipment'] },
  { id: 'appliances', name: 'Appliances', icon: '🔌', color: '#64748B', kind: 'physical', subcategories: ['Washers', 'Dryers', 'Fridges', 'Ovens', 'Dishwashers', 'Vacuum Cleaners', 'Air Purifiers', 'Heating & Cooling'] },

  // ── Sports & outdoors ──
  { id: 'sports', name: 'Sports & Outdoors', icon: '⚽', color: '#16A34A', kind: 'physical', subcategories: ['Fitness', 'Camping', 'Cycling', 'Team Sports', 'Water Sports', 'Skate', 'Running', 'Yoga & Pilates'] },
  { id: 'fitness', name: 'Fitness Equipment', icon: '🏋️', color: '#15803D', kind: 'physical', subcategories: ['Weights', 'Cardio Machines', 'Benches & Racks', 'Resistance Bands', 'Home Gyms', 'Wearables', 'Supplements', 'Apparel'] },
  { id: 'cycling', name: 'Cycling', icon: '🚴', color: '#059669', kind: 'physical', subcategories: ['Road Bikes', 'Mountain Bikes', 'E-Bikes', 'Kids Bikes', 'Components', 'Helmets', 'Clothing', 'Accessories'] },
  { id: 'camping-hiking', name: 'Camping & Hiking', icon: '⛺', color: '#65A30D', kind: 'physical', subcategories: ['Tents', 'Sleeping Bags', 'Backpacks', 'Cookware', 'Navigation', 'Clothing', 'Footwear', 'Survival Gear'] },
  { id: 'water-sports', name: 'Water Sports', icon: '🏄', color: '#0284C7', kind: 'physical', subcategories: ['Surfboards', 'Kayaks', 'Paddleboards', 'Wetsuits', 'Snorkelling', 'Swimming', 'Boating', 'Fishing Gear'] },
  { id: 'golf', name: 'Golf', icon: '⛳', color: '#166534', kind: 'physical', subcategories: ['Clubs', 'Bags', 'Balls', 'Apparel', 'Shoes', 'Carts', 'Training Aids', 'Accessories'] },

  // ── Automotive & industrial ──
  { id: 'automotive', name: 'Automotive', icon: '🚗', color: '#64748B', kind: 'physical', subcategories: ['Parts', 'Accessories', 'Tools', 'Motorcycle', 'Car Care', 'Electronics', 'Wheels & Tyres', 'RV & Caravan'] },
  { id: 'car-parts', name: 'Car Parts', icon: '🔩', color: '#475569', kind: 'physical', subcategories: ['Engine', 'Brakes', 'Suspension', 'Body Parts', 'Interior', 'Lighting', 'Exhaust', 'Performance'] },
  { id: 'motorcycle', name: 'Motorcycle', icon: '🏍️', color: '#334155', kind: 'physical', subcategories: ['Bikes', 'Helmets', 'Gear', 'Parts', 'Accessories', 'Tyres', 'Tools', 'Trailers'] },
  { id: 'boats-marine', name: 'Boats & Marine', icon: '⛵', color: '#0369A1', kind: 'physical', subcategories: ['Boats', 'Engines', 'Trailers', 'Safety Gear', 'Navigation', 'Fishing Boats', 'Sailing', 'Jet Skis'] },
  { id: 'tools-industrial', name: 'Tools & Industrial', icon: '🏭', color: '#57534E', kind: 'physical', subcategories: ['Power Tools', 'Hand Tools', 'Welding', 'Workshop', 'Safety PPE', 'Compressors', 'Generators', 'Material Handling'] },

  // ── Collectibles & hobbies ──
  { id: 'collectibles', name: 'Collectibles', icon: '🏆', color: '#7C3AED', kind: 'physical', subcategories: ['Trading Cards', 'Coins', 'Antiques', 'Memorabilia', 'Toys', 'Figurines', 'Stamps', 'Autographs'] },
  { id: 'trading-cards', name: 'Trading Cards', icon: '🃏', color: '#7E22CE', kind: 'physical', subcategories: ['Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'Sports Cards', 'Graded Slabs', 'Sealed Products', 'Singles', 'Accessories'] },
  { id: 'coins-stamps', name: 'Coins & Stamps', icon: '🪙', color: '#CA8A04', kind: 'physical', subcategories: ['UK Coins', 'World Coins', 'Gold & Silver', 'Banknotes', 'Stamps', 'Medals', 'Bullion', 'Supplies'] },
  { id: 'toys-games', name: 'Toys & Board Games', icon: '🧩', color: '#EA580C', kind: 'physical', subcategories: ['Action Figures', 'LEGO', 'Dolls', 'Board Games', 'Puzzles', 'RC Toys', 'Educational', 'Vintage Toys'] },
  { id: 'comics-manga', name: 'Comics & Manga', icon: '📕', color: '#DC2626', kind: 'physical', subcategories: ['Marvel', 'DC', 'Manga', 'Graphic Novels', 'Graded Comics', 'Indie', 'Posters', 'Merchandise'] },
  { id: 'handmade', name: 'Handmade & Craft', icon: '🧶', color: '#D97706', kind: 'physical', subcategories: ['Jewellery', 'Art', 'Crafts', 'Custom Orders', 'Supplies', 'Candles', 'Soap & Bath', 'Knitting & Crochet'] },

  // ── Books & media ──
  { id: 'books', name: 'Books & Media', icon: '📚', color: '#6366F1', kind: 'physical', subcategories: ['Fiction', 'Non-Fiction', 'Textbooks', 'Children\'s Books', 'Rare Books', 'Magazines', 'Maps', 'Book Sets'] },
  { id: 'vinyl-cds', name: 'Vinyl & CDs', icon: '💿', color: '#4F46E5', kind: 'physical', subcategories: ['Vinyl Records', 'CDs', 'Cassettes', 'Box Sets', 'Rare Pressings', 'Music Memorabilia', 'DJ Equipment', 'Posters'] },
  { id: 'movies-dvds', name: 'Movies & DVDs', icon: '🎬', color: '#4338CA', kind: 'physical', subcategories: ['Blu-ray', 'DVD', '4K UHD', 'Box Sets', 'Steelbooks', 'VHS', 'Posters', 'Memorabilia'] },
  { id: 'video-games-retail', name: 'Video Games (Physical)', icon: '🎮', color: '#312E81', kind: 'physical', subcategories: ['PlayStation', 'Xbox', 'Nintendo', 'PC Games', 'Retro Games', 'Collectors Editions', 'Strategy Guides', 'Accessories'] },

  // ── Pets & family ──
  { id: 'pets', name: 'Pets & Animals', icon: '🐾', color: '#CA8A04', kind: 'physical', subcategories: ['Dogs', 'Cats', 'Aquarium', 'Birds', 'Small Pets', 'Reptiles', 'Horses', 'Farm Animals'] },
  { id: 'pet-supplies', name: 'Pet Supplies', icon: '🦴', color: '#A16207', kind: 'physical', subcategories: ['Food', 'Toys', 'Beds', 'Grooming', 'Collars & Leads', 'Aquarium Gear', 'Carriers', 'Health & Wellness'] },
  { id: 'baby', name: 'Baby & Nursery', icon: '🍼', color: '#F472B6', kind: 'physical', subcategories: ['Clothing', 'Gear', 'Nursery Furniture', 'Feeding', 'Strollers', 'Car Seats', 'Monitors', 'Bath & Care'] },
  { id: 'kids-toys', name: 'Kids & Toys', icon: '🧸', color: '#FB7185', kind: 'physical', subcategories: ['Baby Toys', 'Outdoor Play', 'STEM Toys', 'Dress Up', 'Bikes & Scooters', 'Party Supplies', 'School Supplies', 'Costumes'] },

  // ── Music & instruments ──
  { id: 'music', name: 'Musical Instruments', icon: '🎸', color: '#DC2626', kind: 'physical', subcategories: ['Guitars', 'Keyboards', 'Drums', 'DJ & Pro Audio', 'Wind', 'String', 'Recording Gear', 'Vintage Gear'] },
  { id: 'pro-audio', name: 'Pro Audio & DJ', icon: '🎛️', color: '#B91C1C', kind: 'physical', subcategories: ['Mixers', 'Controllers', 'Speakers', 'Microphones', 'Headphones', 'Synthesizers', 'Studio Monitors', 'Cables & Cases'] },

  // ── Food & drink ──
  { id: 'gourmet', name: 'Gourmet & Pantry', icon: '🍯', color: '#B45309', kind: 'physical', subcategories: ['Specialty Foods', 'Coffee & Tea', 'Spices', 'Baked Goods', 'Wine & Spirits', 'Gift Hampers', 'Organic', 'International Foods'] },
  { id: 'wine-spirits', name: 'Wine & Spirits', icon: '🍷', color: '#991B1B', kind: 'physical', subcategories: ['Red Wine', 'White Wine', 'Champagne', 'Whisky', 'Gin', 'Craft Beer', 'Rare Bottles', 'Glassware'] },

  // ── Office & business ──
  { id: 'office', name: 'Office & Business', icon: '📎', color: '#475569', kind: 'physical', subcategories: ['Desks', 'Chairs', 'Supplies', 'Printers', 'Storage', 'Signage', 'POS Equipment', 'Safes'] },
  { id: 'business-equipment', name: 'Business Equipment', icon: '🏢', color: '#334155', kind: 'physical', subcategories: ['Restaurant', 'Retail', 'Salon & Spa', 'Medical', 'Cleaning', 'Catering', 'Warehouse', 'Franchise Assets'] },

  // ── Art & creative ──
  { id: 'art', name: 'Art & Prints', icon: '🖼️', color: '#9333EA', kind: 'physical', subcategories: ['Paintings', 'Prints', 'Photography', 'Sculpture', 'Posters', 'Street Art', 'Limited Editions', 'Framing Supplies'] },
  { id: 'craft-supplies', name: 'Craft Supplies', icon: '✂️', color: '#C026D3', kind: 'physical', subcategories: ['Fabric', 'Yarn', 'Beads', 'Paper Craft', 'Painting Supplies', 'Scrapbooking', 'Resin & Moulds', 'Tools'] },

  // ── Services ──
  { id: 'services', name: 'Services', icon: '🛠️', color: '#78716C', kind: 'service', subcategories: ['Design', 'Development', 'Marketing', 'Consulting', 'Repairs', 'Lessons', 'Writing', 'Translation'] },
  { id: 'design-creative', name: 'Design & Creative', icon: '🎨', color: '#A855F7', kind: 'service', subcategories: ['Logo Design', 'Web Design', 'UI/UX', 'Illustration', 'Video Editing', 'Animation', 'Branding', 'Print Design'] },
  { id: 'web-development', name: 'Web & App Development', icon: '👨‍💻', color: '#2563EB', kind: 'service', subcategories: ['WordPress', 'Shopify', 'Custom Web Apps', 'Mobile Apps', 'API Integration', 'Maintenance', 'Bug Fixes', 'DevOps'] },
  { id: 'marketing-seo', name: 'Marketing & SEO', icon: '📈', color: '#059669', kind: 'service', subcategories: ['SEO', 'PPC Ads', 'Social Media', 'Email Marketing', 'Content Writing', 'Influencer', 'Analytics Setup', 'Brand Strategy'] },
  { id: 'tutoring-lessons', name: 'Tutoring & Lessons', icon: '📐', color: '#0D9488', kind: 'service', subcategories: ['Academic', 'Music Lessons', 'Language', 'Coding', 'Driving Lessons', 'Fitness Coaching', 'Art Classes', 'Exam Prep'] },
  { id: 'home-services', name: 'Home Services', icon: '🏡', color: '#65A30D', kind: 'service', subcategories: ['Cleaning', 'Plumbing', 'Electrical', 'Gardening', 'Moving', 'Painting', 'Handyman', 'Pest Control'] },

  // ── Travel & tickets ──
  { id: 'travel', name: 'Travel & Experiences', icon: '✈️', color: '#0284C7', kind: 'service', subcategories: ['Flights', 'Hotels', 'Holiday Packages', 'Tours', 'Travel Vouchers', 'Airport Transfers', 'Travel Insurance', 'Experiences'] },
  { id: 'event-tickets', name: 'Event Tickets', icon: '🎫', color: '#7C3AED', kind: 'digital', subcategories: ['Concerts', 'Sports Events', 'Theatre', 'Festivals', 'Comedy', 'Conferences', 'Theme Parks', 'Other Events'] },

  // ── Health & wellness ──
  { id: 'health-wellness', name: 'Health & Wellness', icon: '🩺', color: '#0D9488', kind: 'physical', subcategories: ['Vitamins', 'Supplements', 'Fitness Nutrition', 'Medical Equipment', 'Mobility Aids', 'Massage Tools', 'Sleep Aids', 'Personal Care Devices'] },

  // ── Education ──
  { id: 'education', name: 'Education & Courses', icon: '🎓', color: '#4F46E5', kind: 'digital', subcategories: ['Online Courses', 'Udemy & Coursera', 'Certifications', 'Study Notes', 'Exam Materials', 'Language Courses', 'Workshops', 'Coaching Programs'] },

  // ── Property (listings) ──
  { id: 'property', name: 'Property & Real Estate', icon: '🏘️', color: '#0369A1', kind: 'service', subcategories: ['Residential Sale', 'Rentals', 'Commercial', 'Land', 'Holiday Lets', 'Room Rentals', 'Parking Spaces', 'Property Services'] },

  // ── Charity ──
  { id: 'charity', name: 'Charity & Fundraising', icon: '❤️', color: '#E11D48', kind: 'service', subcategories: ['Donations', 'Fundraisers', 'Charity Shops', 'Volunteer Services', 'Sponsored Events', 'Raffles', 'Community Projects', 'Other'] },
]

export function seedCategories(db: Db) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO categories (id, name, icon, color, kind, subcategories, custom, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  )
  const now = new Date().toISOString()
  for (const cat of defaultCategories) {
    insert.run(cat.id, cat.name, cat.icon, cat.color, cat.kind, JSON.stringify(cat.subcategories), now)
  }
}

/** Upsert default categories — updates non-custom rows so subcategories stay current. */
export function syncDefaultCategories(db: Db) {
  const now = new Date().toISOString()
  const insert = db.prepare(
    `INSERT INTO categories (id, name, icon, color, kind, subcategories, custom, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  )
  const update = db.prepare(
    `UPDATE categories SET name = ?, icon = ?, color = ?, kind = ?, subcategories = ?
     WHERE id = ? AND (custom = 0 OR custom IS NULL)`,
  )
  for (const cat of defaultCategories) {
    const row = db.prepare('SELECT id, custom FROM categories WHERE id = ?').get(cat.id) as { id: string; custom: number } | undefined
    if (!row) {
      insert.run(cat.id, cat.name, cat.icon, cat.color, cat.kind, JSON.stringify(cat.subcategories), now)
    } else if (row.custom === 0) {
      update.run(cat.name, cat.icon, cat.color, cat.kind, JSON.stringify(cat.subcategories), cat.id)
    }
  }
}

export function rowToCategory(row: {
  id: string
  name: string
  icon: string
  color: string
  kind: string
  subcategories: string
  custom: number
}) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    kind: row.kind as 'physical' | 'digital' | 'service',
    subcategories: JSON.parse(row.subcategories) as string[],
    custom: row.custom === 1,
  }
}
