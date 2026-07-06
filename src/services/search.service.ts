import { db } from '../db';
import { savedSearches } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SearchFilters } from '../types';

export async function createSearch(userId: string, filters: SearchFilters) {
  const result = await db
    .insert(savedSearches)
    .values({
      userId,
      city: filters.city,
      country: filters.country,
      minPrice: filters.minPrice || null,
      maxPrice: filters.maxPrice || null,
      bedrooms: filters.bedrooms || null,
      isActive: true,
      notifyEnabled: true,
      lastScrapedAt: null,
    })
    .returning();

  return result[0];
}

export async function getSearches(userId: string) {
  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
}

export async function getSearchById(id: number) {
  const result = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.id, id))
    .limit(1);

  return result[0] || null;
}

export async function toggleSearch(id: number) {
  const existing = await getSearchById(id);
  if (!existing) return null;

  const result = await db
    .update(savedSearches)
    .set({ isActive: !existing.isActive })
    .where(eq(savedSearches.id, id))
    .returning();

  return result[0];
}

export async function deleteSearch(id: number) {
  await db.delete(savedSearches).where(eq(savedSearches.id, id));
  return { deleted: true };
}

export async function getActiveSearches() {
  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.isActive, true));
}

export async function updateLastScrapedAt(id: number) {
  await db
    .update(savedSearches)
    .set({ lastScrapedAt: new Date() })
    .where(eq(savedSearches.id, id));
}
