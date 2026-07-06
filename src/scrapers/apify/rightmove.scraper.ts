import apify from '../../config/apify';
import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeRightmove(
  city: string,
  country: string = 'uk',
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const run = await apify
      .actor('automation-lab/rightmove-scraper')
      .call({
        searchTerms: `${city} rent`,
        maxListings: filters?.maxResults || 50,
      });
    const { items } = await apify
      .dataset(run.defaultDatasetId)
      .listItems();

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `rightmove_${item.id || item.listingId || Math.random().toString(36).slice(2)}`,
        source: 'rightmove',
        sourceUrl: item.url || `https://www.rightmove.co.uk${item.propertyLink || ''}`,
        title: item.title || item.displayableAddress || 'Property for rent',
        description: item.summary || item.description || null,
        price: extractPrice(item.price || item.priceAmount),
        currency: 'GBP',
        city: item.location || city,
        country: 'UK',
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        bedrooms: item.bedrooms || null,
        bathrooms: item.bathrooms || null,
        surfaceArea: extractSurface(item.summary) || extractSurface(item.description),
        images: (item.images || [item.imageUrl, item.mainImage]).filter(Boolean),
        contactInfo: item.agent
          ? { name: item.agent.name, phone: item.agent.phone || undefined }
          : null,
        listingDate: item.listingDate ? new Date(item.listingDate) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Rightmove scraper failed for ${city}:`, err);
    return [];
  }
}
