import apify from '../../config/apify';
import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeLeboncoin(
  city: string,
  country: string = 'france',
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const run = await apify
      .actor('parsebird/leboncoin-scraper')
      .call({
        location: city,
        category: 'locations',
        maxItems: filters?.maxResults || 50,
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
      });
    const { items } = await apify
      .dataset(run.defaultDatasetId)
      .listItems();

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `leboncoin_${item.id || item.list_id || Math.random().toString(36).slice(2)}`,
        source: 'leboncoin',
        sourceUrl: item.url || `https://www.leboncoin.fr/ad/locations/${item.id || ''}`,
        title: item.subject || item.title || 'Property for rent',
        description: item.body || item.description || null,
        price: extractPrice(item.price || item.price_cents),
        currency: 'EUR',
        city: item.location?.city || city,
        country: 'France',
        latitude: item.location?.lat || null,
        longitude: item.location?.lng || null,
        bedrooms: item.attributes?.find((a: any) => a.key === 'rooms')?.value || null,
        bathrooms: null,
        surfaceArea:
          item.attributes?.find((a: any) => a.key === 'square')?.value ||
          extractSurface(item.body) ||
          extractSurface(item.subject),
        images: (item.images?.urls || item.images || []).filter(Boolean),
        contactInfo: item.owner
          ? { name: item.owner.name, phone: item.owner.phone || undefined }
          : null,
        listingDate: item.index_date ? new Date(item.index_date) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Leboncoin scraper failed for ${city}:`, err);
    return [];
  }
}
