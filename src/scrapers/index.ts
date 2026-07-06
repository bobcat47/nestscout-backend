import type { ScrapedListing } from '../types';
import { db } from '../db';
import { listings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Apify scrapers
import { scrapeFacebookMarketplace } from './apify/facebook.scraper';
import { scrapeFotocasa } from './apify/fotocasa.scraper';
import { scrapeRightmove } from './apify/rightmove.scraper';
import { scrapeLeboncoin } from './apify/leboncoin.scraper';

// Parse.bot scrapers
import { scrapeImmoScout24 } from './parsebot/immoscout24.scraper';
import { scrapeImmowelt } from './parsebot/immowelt.scraper';
import { scrapeZoopla } from './parsebot/zoopla.scraper';
import { scrapeImmobiliare } from './parsebot/immobiliare.scraper';

// Custom Playwright scrapers
import { scrapeIdealista } from './custom/idealista.scraper';
import { scrapeSubito } from './custom/subito.scraper';

// Country → scraper function mapping
const scraperRegistry: Record<string, ((city: string, country: string, filters?: any) => Promise<ScrapedListing[]>)[]> = {
  spain: [scrapeFotocasa, scrapeIdealista],
  france: [scrapeLeboncoin],
  germany: [scrapeImmoScout24, scrapeImmowelt],
  italy: [scrapeImmobiliare, scrapeIdealista, scrapeSubito],
  uk: [scrapeRightmove, scrapeZoopla],
  portugal: [scrapeIdealista],
  // Facebook Marketplace is global
  _global: [scrapeFacebookMarketplace],
};

export async function runScrapersForSearch(
  city: string,
  country: string,
  filters?: any
): Promise<ScrapedListing[]> {
  const normalizedCountry = country.toLowerCase().trim();
  const countryScrapers = scraperRegistry[normalizedCountry] || [];
  const globalScrapers = scraperRegistry._global || [];
  const allScrapers = [...countryScrapers, ...globalScrapers];

  if (allScrapers.length === 0) {
    console.warn(`No scrapers configured for country: ${country}`);
    return [];
  }

  console.log(`Running ${allScrapers.length} scrapers for ${city}, ${country}`);

  const results = await Promise.allSettled(
    allScrapers.map((scraper) => scraper(city, country, filters))
  );

  const allListings: ScrapedListing[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allListings.push(...result.value);
    } else {
      console.error('Scraper failed:', result.reason);
    }
  }

  console.log(`Collected ${allListings.length} raw listings for ${city}`);

  // Deduplicate by externalId
  const deduped = deduplicateListings(allListings);
  console.log(`After dedup: ${deduped.length} listings for ${city}`);

  return deduped;
}

export function deduplicateListings(listings: ScrapedListing[]): ScrapedListing[] {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    if (seen.has(listing.externalId)) return false;
    seen.add(listing.externalId);
    return true;
  });
}

export async function saveListingsIfNotExist(newListings: ScrapedListing[]): Promise<number> {
  let saved = 0;

  for (const listing of newListings) {
    try {
      // Check if listing already exists
      const existing = await db
        .select()
        .from(listings)
        .where(eq(listings.externalId, listing.externalId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing listing (price, availability)
        const existingListing = existing[0];
        const newPrice = String(listing.price);
        if (existingListing.price !== newPrice) {
          const history = (existingListing.priceHistory as any[]) || [];
          history.push({ price: existingListing.price, date: new Date().toISOString() });
          await db
            .update(listings)
            .set({
              price: newPrice,
              priceHistory: history,
              scrapedAt: new Date(),
              isActive: true,
            })
            .where(eq(listings.externalId, listing.externalId));
        }
        continue;
      }

      // Insert new listing
      await db.insert(listings).values({
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
      });

      saved++;
    } catch (err) {
      console.error(`Failed to save listing ${listing.externalId}:`, err);
    }
  }

  return saved;
}

export {
  scrapeFacebookMarketplace,
  scrapeFotocasa,
  scrapeRightmove,
  scrapeLeboncoin,
  scrapeImmoScout24,
  scrapeImmowelt,
  scrapeZoopla,
  scrapeImmobiliare,
  scrapeIdealista,
  scrapeSubito,
};
