import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeImmobiliare(
  city: string,
  country: string = 'italy',
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const params = new URLSearchParams({
      page: '1',
      location: city.toLowerCase(),
      contract: 'rent',
      ...(filters?.minPrice ? { prezzoMinimo: String(filters.minPrice) } : {}),
      ...(filters?.maxPrice ? { prezzoMassimo: String(filters.maxPrice) } : {}),
      ...(filters?.bedrooms ? { locali: String(filters.bedrooms) } : {}),
    });

    const response = await fetch(
      `https://api.parse.bot/scraper/immobiliare-it/search?${params}`,
      {
        headers: {
          'X-API-Key': process.env.PARSE_API_KEY || '',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Parse.bot Immobiliare error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.data?.listings || data.listings || data.results || [];

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `immobiliare_${item.id || item.codInserzione || Math.random().toString(36).slice(2)}`,
        source: 'immobiliare',
        sourceUrl: item.url || item.urlAnnuncio || '',
        title: item.title || item.titolo || 'Property for rent',
        description: item.description || item.descrizione || null,
        price: extractPrice(item.price || item.prezzo || item.rent),
        currency: 'EUR',
        city: item.location?.city || item.citta || city,
        country: 'Italy',
        latitude: item.location?.latitude || item.latitude || null,
        longitude: item.location?.longitude || item.longitude || null,
        bedrooms: item.rooms || item.locali || null,
        bathrooms: item.bathrooms || item.bagni || null,
        surfaceArea:
          item.surface || item.superficie || item.surfaceValue || extractSurface(item.description),
        images: (item.images || item.foto || item.imageUrls || []).filter(Boolean),
        contactInfo: item.advertiser || item.agency
          ? {
              name: item.advertiser?.name || item.agency?.name,
              phone: item.advertiser?.phone || item.agency?.phone || undefined,
              email: item.advertiser?.email || item.agency?.email || undefined,
            }
          : null,
        listingDate: item.publishedAt ? new Date(item.publishedAt) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Immobiliare scraper failed for ${city}:`, err);
    return [];
  }
}
