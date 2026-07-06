import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeImmowelt(
  city: string,
  country: string = 'germany',
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const params = new URLSearchParams({
      page: '1',
      location: city.toLowerCase(),
      ...(filters?.minPrice ? { min_price: String(filters.minPrice) } : {}),
      ...(filters?.maxPrice ? { max_price: String(filters.maxPrice) } : {}),
      ...(filters?.bedrooms ? { rooms: String(filters.bedrooms) } : {}),
    });

    const response = await fetch(
      `https://api.parse.bot/scraper/immowelt-de/search?${params}`,
      {
        headers: {
          'X-API-Key': process.env.PARSE_API_KEY || '',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Parse.bot Immowelt error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.data?.listings || data.listings || data.results || [];

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `immowelt_${item.id || item.objectId || Math.random().toString(36).slice(2)}`,
        source: 'immowelt',
        sourceUrl: item.url || item.detailUrl || '',
        title: item.title || 'Property for rent',
        description: item.description || null,
        price: extractPrice(item.price || item.rent || item.coldRent),
        currency: 'EUR',
        city: item.address?.city || item.city || city,
        country: 'Germany',
        latitude: item.address?.latitude || item.latitude || null,
        longitude: item.address?.longitude || item.longitude || null,
        bedrooms: item.rooms || item.numberOfRooms || null,
        bathrooms: item.bathrooms || null,
        surfaceArea: item.livingSpace || item.surfaceArea || extractSurface(item.description),
        images: (item.images || item.imageUrls || []).filter(Boolean),
        contactInfo: item.contact
          ? {
              name: item.contact.name,
              phone: item.contact.phone || undefined,
              email: item.contact.email || undefined,
            }
          : null,
        listingDate: item.publishedAt ? new Date(item.publishedAt) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Immowelt scraper failed for ${city}:`, err);
    return [];
  }
}
