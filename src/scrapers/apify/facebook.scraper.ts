import apify from '../../config/apify';
import type { ScrapedListing } from '../../types';
import { extractPrice, extractSurface, inferCurrency } from '../utils';

export async function scrapeFacebookMarketplace(
  city: string,
  country: string,
  filters?: any
): Promise<ScrapedListing[]> {
  try {
    const run = await apify
      .actor('vivid-softwares/facebook-property-scraper')
      .call({
        startUrls: [
          {
            url: `https://www.facebook.com/marketplace/${city
              .toLowerCase()
              .replace(/\s+/g, '-')}/propertyrentals`,
          },
        ],
        maxResults: filters?.maxResults || 50,
        rentalsOnly: true,
      });
    const { items } = await apify
      .dataset(run.defaultDatasetId)
      .listItems();

    return items.map(
      (item: any): ScrapedListing => ({
        externalId: `fb_${item.listingId || item.id || Math.random().toString(36).slice(2)}`,
        source: 'facebook_marketplace',
        sourceUrl: item.url || '',
        title: item.title || 'Property for rent',
        description: item.description || null,
        price: extractPrice(item.price),
        currency: inferCurrency(country),
        city,
        country,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        bedrooms: item.bedrooms || null,
        bathrooms: item.bathrooms || null,
        surfaceArea: extractSurface(item.description),
        images: (item.images || [item.imageUrl]).filter(Boolean),
        contactInfo: item.seller
          ? { name: item.seller.name, phone: item.seller.phone || undefined }
          : null,
        listingDate: item.listedDate ? new Date(item.listedDate) : new Date(),
        scrapedAt: new Date(),
      })
    );
  } catch (err) {
    console.error(`Facebook scraper failed for ${city}:`, err);
    return [];
  }
}
