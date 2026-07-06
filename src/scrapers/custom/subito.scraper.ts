import { chromium, type Browser } from 'playwright';
import type { ScrapedListing } from '../../types';
import { BaseScraper } from './base.scraper';
import { extractPrice, extractSurface } from '../utils';

export class SubitoScraper extends BaseScraper {
  readonly source = 'subito';
  readonly baseUrl = 'https://www.subito.it';

  async scrape(options: {
    city: string;
    country: string;
    filters?: any;
  }): Promise<ScrapedListing[]> {
    const { city, filters } = options;
    const listings: ScrapedListing[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'it-IT',
      });

      const page = await context.newPage();
      const normalizedCity = this.normalizeCity(city);
      const searchUrl = `https://www.subito.it/annunci-italia/vendita/appartamenti/${normalizedCity}/?q=affitto`;

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent
      try {
        const acceptBtn = page.locator('button[aria-label="Accetta tutti"], #didomi-notice-agree-button, .accept-all');
        if (await acceptBtn.isVisible({ timeout: 5000 })) {
          await acceptBtn.click();
          await this.sleep(1000);
        }
      } catch {
        // No cookie banner
      }

      const itemSelector = 'div.Card-module_card__f9df0, article.Card, [class*="card"]';
      await page.waitForSelector(itemSelector, { timeout: 15000 }).catch(() => {
        console.warn(`No listings found on Subito for ${city}`);
      });

      const items = await page.locator(itemSelector).all();
      const maxResults = filters?.maxResults || 50;

      for (let i = 0; i < Math.min(items.length, maxResults); i++) {
        try {
          const item = items[i];
          const title = await item.locator('h2, .title, [class*="title"]').textContent().catch(() => null);
          const priceText = await item.locator('.price, [class*="price"]').textContent().catch(() => null);
          const detailUrl = await item.locator('a').first().getAttribute('href').catch(() => null);
          const imgSrc = await item.locator('img').getAttribute('src').catch(() => null);
          const locationText = await item.locator('.location, [class*="location"], .city').textContent().catch(() => null);
          const featuresText = await item.locator('.features, [class*="feature"]').textContent().catch(() => '');

          if (!title && !priceText) continue;

          const roomsMatch = featuresText?.match(/(\d+)\s*local/i);
          const surfaceMatch = featuresText?.match(/(\d+)\s*m[²2]/);

          listings.push({
            externalId: `subito_${detailUrl?.split('/').pop()?.replace(/\D/g, '') || Math.random().toString(36).slice(2)}`,
            source: 'subito',
            sourceUrl: detailUrl || searchUrl,
            title: title?.trim() || 'Property for rent',
            description: null,
            price: extractPrice(priceText),
            currency: 'EUR',
            city: locationText?.trim() || city,
            country: 'Italy',
            latitude: null,
            longitude: null,
            bedrooms: roomsMatch ? parseInt(roomsMatch[1]) : null,
            bathrooms: null,
            surfaceArea: surfaceMatch ? parseInt(surfaceMatch[1]) : extractSurface(title),
            images: imgSrc ? [imgSrc] : [],
            contactInfo: null,
            listingDate: new Date(),
            scrapedAt: new Date(),
          });
        } catch (itemErr) {
          console.warn(`Error parsing Subito item ${i}:`, itemErr);
        }
      }

      await context.close();
    } catch (err) {
      console.error(`Subito scraper failed for ${city}:`, err);
    } finally {
      if (browser) await browser.close();
    }

    return listings;
  }
}

export async function scrapeSubito(
  city: string,
  country: string = 'italy',
  filters?: any
): Promise<ScrapedListing[]> {
  const scraper = new SubitoScraper();
  return scraper.scrape({ city, country, filters });
}
