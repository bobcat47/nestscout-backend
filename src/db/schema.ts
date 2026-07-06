import { pgTable, serial, varchar, text, integer, decimal, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  externalId: varchar('external_id', { length: 255 }).notNull().unique(),
  source: varchar('source', { length: 50 }).notNull(),
  sourceUrl: text('source_url').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 50 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  surfaceArea: integer('surface_area'),
  images: text('images').array(),
  contactInfo: jsonb('contact_info'),
  listingDate: timestamp('listing_date').notNull().defaultNow(),
  scrapedAt: timestamp('scraped_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  priceHistory: jsonb('price_history').default([]),
}, (table) => ({
  sourceIdx: index('source_idx').on(table.source),
  cityIdx: index('city_idx').on(table.city),
  priceIdx: index('price_idx').on(table.price),
  bedroomsIdx: index('bedrooms_idx').on(table.bedrooms),
  activeIdx: index('active_idx').on(table.isActive),
}));

export const savedSearches = pgTable('saved_searches', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 50 }).notNull(),
  minPrice: integer('min_price'),
  maxPrice: integer('max_price'),
  bedrooms: integer('bedrooms'),
  isActive: boolean('is_active').default(true),
  notifyEnabled: boolean('notify_enabled').default(true),
  lastScrapedAt: timestamp('last_scraped_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  listingId: integer('listing_id').references(() => listings.id),
  type: varchar('type', { length: 20 }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
