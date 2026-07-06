import apify from '../../config/apify';
import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeFotocasa(
  city: string,
  country: string = 'spain',
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const run = await apify
      .actor('parsebird/fotocasa-scraper')
      .call({
        location: city,
        operation: 'rent',
        maxItems: filters?.maxResults || 50,
      });
    const { items } = await apify
      .dataset(run.defaultDatasetId)
      .listItems();

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `fotocasa_${item.id || item.adId || Math.random().toString(36).slice(2)}`,
        source: 'fotocasa',
        sourceUrl: item.url || item.detailUrl || '',
        title: item.title || 'Property for rent',
        description: item.description || null,
        price: extractPrice(item.price),
        currency: inferCurrency(country),
        city: item.city || city,
        country,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        bedrooms: item.rooms || item.bedrooms || null,
        bathrooms: item.bathrooms || null,
        surfaceArea: item.surfaceArea || extractSurface(item.description) || extractSurface(item.title),
        images: (item.images || [item.image, item.imageUrl]).filter(Boolean),
        contactInfo: item.agency || item.contact
          ? { name: item.agency?.name || item.contact?.name, phone: item.agency?.phone || item.contact?.phone }
          : null,
        listingDate: item.date ? new Date(item.date) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Fotocasa scraper failed for ${city}:`, err);
    return [];
  }
}
