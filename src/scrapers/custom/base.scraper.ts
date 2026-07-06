import type { ScrapedListing } from '../../types';

export interface ScraperOptions {
  city: string;
  country: string;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    minSurface?: number;
    maxResults?: number;
  };
}

export abstract class BaseScraper {
  abstract readonly source: string;
  abstract readonly baseUrl: string;

  abstract scrape(options: ScraperOptions): Promise<ScrapedListing[]>;

  protected normalizeCity(city: string): string {
    return city
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected randomDelay(min = 1000, max = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.sleep(delay);
  }
}
