import { chromium, type Browser, type Page } from 'playwright';
import type { ScrapedListing } from '../../types';
import { BaseScraper } from './base.scraper';
import { extractPrice, extractSurface } from '../utils';

export class IdealistaScraper extends BaseScraper {
  readonly source = 'idealista';
  readonly baseUrl = 'https://www.idealista.com';

  private countryDomains: Record<string, string> = {
    spain: 'www.idealista.com',
    portugal: 'www.idealista.pt',
    italy: 'www.idealista.it',
  };

  async scrape(options: {
    city: string;
    country: string;
    filters?: any;
  }): Promise<ScrapedListing[]> {
    const { city, country, filters } = options;
    const listings: ScrapedListing[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
      });

      const page = await context.newPage();
      const domain = this.countryDomains[country.toLowerCase()] || this.countryDomains.spain;
      const normalizedCity = this.normalizeCity(city);
      const searchUrl = `https://${domain}/alquiler-viviendas/${normalizedCity}/`;

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 4000);

      // Handle cookie consent if present
      try {
        const acceptBtn = page.locator('button[id="didomi-notice-agree-button"], .accept-cookies, #accept-cookies');
        if (await acceptBtn.isVisible({ timeout: 5000 })) {
          await acceptBtn.click();
          await this.sleep(1000);
        }
      } catch {
        // No cookie banner
      }

      // Extract listing items
      const articleSelector = 'article.item';
      await page.waitForSelector(articleSelector, { timeout: 15000 }).catch(() => {
        console.warn(`No listings found on Idealista for ${city}`);
      });

      const items = await page.locator(articleSelector).all();
      const maxResults = filters?.maxResults || 50;

      for (let i = 0; i < Math.min(items.length, maxResults); i++) {
        try {
          const item = items[i];
          const title = await item.locator('.item-link, .item-title').textContent().catch(() => null);
          const priceText = await item.locator('.item-price, .price').textContent().catch(() => null);
          const detailUrl = await item.locator('.item-link').getAttribute('href').catch(() => null);
          const imgSrc = await item.locator('img').getAttribute('src').catch(() => null);
          const description = await item.locator('.item-description, .description').textContent().catch(() => null);

          if (!title && !priceText) continue;

          // Extract features
          const featuresText = await item.locator('.item-detail, .features').textContent().catch(() => '');
          const roomsMatch = featuresText?.match(/(\d+)\s*hab/);
          const surfaceMatch = featuresText?.match(/(\d+)\s*m[²2]/);

          listings.push({
            externalId: `idealista_${detailUrl?.split('/').pop()?.replace('.htm', '') || Math.random().toString(36).slice(2)}`,
            source: 'idealista',
            sourceUrl: detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://${domain}${detailUrl}`) : searchUrl,
            title: title?.trim() || 'Property for rent',
            description: description?.trim() || null,
            price: extractPrice(priceText),
            currency: inferCurrency(country),
            city,
            country,
            latitude: null,
            longitude: null,
            bedrooms: roomsMatch ? parseInt(roomsMatch[1]) : null,
            bathrooms: null,
            surfaceArea: surfaceMatch ? parseInt(surfaceMatch[1]) : extractSurface(description) || extractSurface(title),
            images: imgSrc ? [imgSrc] : [],
            contactInfo: null,
            listingDate: new Date(),
            scrapedAt: new Date(),
          });
        } catch (itemErr) {
          console.warn(`Error parsing Idealista item ${i}:`, itemErr);
        }
      }

      await context.close();
    } catch (err) {
      console.error(`Idealista scraper failed for ${city}:`, err);
    } finally {
      if (browser) await browser.close();
    }

    return listings;
  }
}

function inferCurrency(country: string): string {
  const map: Record<string, string> = {
    spain: 'EUR',
    portugal: 'EUR',
    italy: 'EUR',
  };
  return map[country.toLowerCase()] || 'EUR';
}

export async function scrapeIdealista(
  city: string,
  country: string = 'spain',
  filters?: any
): Promise<ScrapedListing[]> {
  const scraper = new IdealistaScraper();
  return scraper.scrape({ city, country, filters });
}
