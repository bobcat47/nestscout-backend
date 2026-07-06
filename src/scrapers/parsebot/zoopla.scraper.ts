import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeZoopla(
  city: string,
  country: string = 'uk',
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const params = new URLSearchParams({
      page: '1',
      location: city.toLowerCase(),
      section: 'to-rent',
      ...(filters?.minPrice ? { price_min: String(filters.minPrice) } : {}),
      ...(filters?.maxPrice ? { price_max: String(filters.maxPrice) } : {}),
      ...(filters?.bedrooms ? { beds_min: String(filters.bedrooms) } : {}),
    });

    const response = await fetch(
      `https://api.parse.bot/scraper/zoopla-co-uk/search?${params}`,
      {
        headers: {
          'X-API-Key': process.env.PARSE_API_KEY || '',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Parse.bot Zoopla error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.data?.listings || data.listings || data.results || [];

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `zoopla_${item.id || item.listingId || Math.random().toString(36).slice(2)}`,
        source: 'zoopla',
        sourceUrl: item.url || item.detailsUrl || '',
        title: item.title || item.displayableAddress || 'Property for rent',
        description: item.description || item.summary || null,
        price: extractPrice(item.price || item.rentalPrices?.perMonth),
        currency: 'GBP',
        city: item.address?.city || item.locality || city,
        country: 'UK',
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        bedrooms: item.bedrooms || null,
        bathrooms: item.bathrooms || null,
        surfaceArea: extractSurface(item.description) || extractSurface(item.title),
        images: (item.images || item.photoUrls || item.photos || []).filter(Boolean),
        contactInfo: item.agent
          ? {
              name: item.agent.name,
              phone: item.agent.phone || undefined,
              email: item.agent.email || undefined,
            }
          : null,
        listingDate: item.publishedOn ? new Date(item.publishedOn) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Zoopla scraper failed for ${city}:`, err);
    return [];
  }
}
