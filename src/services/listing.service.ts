import { db } from '../db';
import { listings } from '../db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type { ScrapedListing } from '../types';

export interface ListingFilters {
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  source?: string;
  page?: number;
  limit?: number;
}

export async function getListings(filters: ListingFilters = {}) {
  const {
    city,
    country,
    minPrice,
    maxPrice,
    bedrooms,
    source,
    page = 1,
    limit = 20,
  } = filters;

  const conditions = [];

  if (city) conditions.push(sql`${listings.city} ILIKE ${city}`);
  if (country) conditions.push(sql`${listings.country} ILIKE ${country}`);
  if (source) conditions.push(eq(listings.source, source));
  if (bedrooms) conditions.push(eq(listings.bedrooms, bedrooms));
  if (minPrice) conditions.push(gte(listings.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(listings.price, String(maxPrice)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (page - 1) * limit;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(whereClause)
      .orderBy(desc(listings.scrapedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(whereClause),
  ]);

  return {
    data: results,
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.count || 0),
      totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
    },
  };
}

export async function getListingById(id: number) {
  const result = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  return result[0] || null;
}

export async function saveListings(newListings: ScrapedListing[]): Promise<number> {
  const { saveListingsIfNotExist } = await import('../scrapers');
  return saveListingsIfNotExist(newListings);
}

export async function upsertListing(listing: ScrapedListing) {
  const existing = await db
    .select()
    .from(listings)
    .where(eq(listings.externalId, listing.externalId))
    .limit(1);

  if (existing.length > 0) {
    const existingListing = existing[0];
    const newPrice = String(listing.price);
    const updates: Record<string, any> = {
      scrapedAt: new Date(),
      isActive: true,
    };

    if (existingListing.price !== newPrice) {
      const history = (existingListing.priceHistory as any[]) || [];
      history.push({ price: existingListing.price, date: new Date().toISOString() });
      updates.price = newPrice;
      updates.priceHistory = history;
    }

    await db
      .update(listings)
      .set(updates)
      .where(eq(listings.externalId, listing.externalId));

    return { action: 'updated', id: existingListing.id };
  }

  const result = await db
    .insert(listings)
    .values({
      externalId: listing.externalId,
      source: listing.source,
      sourceUrl: listing.sourceUrl,
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      currency: listing.currency,
      city: listing.city,
      country: listing.country,
      latitude: listing.latitude !== null ? String(listing.latitude) : null,
      longitude: listing.longitude !== null ? String(listing.longitude) : null,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      surfaceArea: listing.surfaceArea,
      images: listing.images,
      contactInfo: listing.contactInfo,
      listingDate: listing.listingDate,
      scrapedAt: listing.scrapedAt,
      isActive: true,
      priceHistory: [],
    })
    .returning();

  return { action: 'created', id: result[0].id };
}

export async function deactivateOldListings(cutoffDate: Date): Promise<number> {
  const result = await db
    .update(listings)
    .set({ isActive: false })
    .where(
      and(
        sql`${listings.scrapedAt} < ${cutoffDate}`,
        eq(listings.isActive, true)
      )
    );

  return 0;
}
