import cron from 'node-cron';
import { runScrapersForSearch, saveListingsIfNotExist } from '../scrapers';
import { getActiveSearches, updateLastScrapedAt } from './search.service';
import { createNotification } from './notification.service';

let isRunningFast = false;
let isRunningFull = false;
let isRunningDeep = false;

async function runFastScrape() {
  if (isRunningFast) return;
  isRunningFast = true;

  try {
    console.log('[Scheduler] Starting fast scrape job...');
    const activeSearches = await getActiveSearches();

    const now = new Date();
    const recentSearches = activeSearches.filter((s) => {
      if (!s.lastScrapedAt) return true;
      const diffMs = now.getTime() - new Date(s.lastScrapedAt).getTime();
      return diffMs > 10 * 60 * 1000;
    });

    for (const search of recentSearches.slice(0, 5)) {
      try {
        const filters = {
          minPrice: search.minPrice || undefined,
          maxPrice: search.maxPrice || undefined,
          bedrooms: search.bedrooms || undefined,
        };

        const { scrapeImmoScout24, scrapeImmowelt, scrapeZoopla, scrapeImmobiliare } =
          await import('../scrapers');

        const scrapersByCountry: Record<string, Function[]> = {
          germany: [scrapeImmoScout24, scrapeImmowelt],
          uk: [scrapeZoopla],
          italy: [scrapeImmobiliare],
        };

        const countryScrapers = scrapersByCountry[search.country.toLowerCase()] || [];
        const results = await Promise.allSettled(
          countryScrapers.map((fn) => fn(search.city, search.country, filters))
        );

        const allListings = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .flatMap((r) => r.value);

        if (allListings.length > 0) {
          const saved = await saveListingsIfNotExist(allListings);
          console.log(`[Scheduler] Fast scrape saved ${saved} listings for ${search.city}`);

          if (saved > 0 && search.notifyEnabled) {
            await createNotification(
              search.userId,
              0,
              'new_listings',
              `${saved} new listings in ${search.city}`,
              `Found ${saved} new rental listings in ${search.city}, ${search.country}`
            );
          }
        }

        await updateLastScrapedAt(search.id);
      } catch (err) {
        console.error(`[Scheduler] Fast scrape error for ${search.city}:`, err);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Fast scrape job failed:', err);
  } finally {
    isRunningFast = false;
  }
}

async function runFullScrape() {
  if (isRunningFull) return;
  isRunningFull = true;

  try {
    console.log('[Scheduler] Starting full scrape job...');
    const activeSearches = await getActiveSearches();

    for (const search of activeSearches.slice(0, 10)) {
      try {
        const filters = {
          minPrice: search.minPrice || undefined,
          maxPrice: search.maxPrice || undefined,
          bedrooms: search.bedrooms || undefined,
        };

        const scrapedListings = await runScrapersForSearch(search.city, search.country, filters);

        if (scrapedListings.length > 0) {
          const saved = await saveListingsIfNotExist(scrapedListings);
          console.log(`[Scheduler] Full scrape saved ${saved} listings for ${search.city}`);

          if (saved > 0 && search.notifyEnabled) {
            await createNotification(
              search.userId,
              0,
              'new_listings',
              `${saved} new listings in ${search.city}`,
              `Found ${saved} new rental listings in ${search.city}, ${search.country}`
            );
          }
        }

        await updateLastScrapedAt(search.id);
      } catch (err) {
        console.error(`[Scheduler] Full scrape error for ${search.city}:`, err);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Full scrape job failed:', err);
  } finally {
    isRunningFull = false;
  }
}

async function runDeepScrape() {
  if (isRunningDeep) return;
  isRunningDeep = true;

  try {
    console.log('[Scheduler] Starting deep scrape job...');
    const activeSearches = await getActiveSearches();

    for (const search of activeSearches.slice(0, 3)) {
      try {
        const filters = {
          minPrice: search.minPrice || undefined,
          maxPrice: search.maxPrice || undefined,
          bedrooms: search.bedrooms || undefined,
          maxResults: 30,
        };

        const { scrapeFacebookMarketplace, scrapeIdealista, scrapeSubito } =
          await import('../scrapers');

        const heavyScrapers: Record<string, Function[]> = {
          spain: [scrapeFacebookMarketplace, scrapeIdealista],
          france: [scrapeFacebookMarketplace],
          italy: [scrapeFacebookMarketplace, scrapeIdealista, scrapeSubito],
          germany: [scrapeFacebookMarketplace],
          uk: [scrapeFacebookMarketplace],
          portugal: [scrapeFacebookMarketplace, scrapeIdealista],
        };

        const scrapers = heavyScrapers[search.country.toLowerCase()] || [scrapeFacebookMarketplace];
        const results = await Promise.allSettled(
          scrapers.map((fn) => fn(search.city, search.country, filters))
        );

        const allListings = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .flatMap((r) => r.value);

        if (allListings.length > 0) {
          const saved = await saveListingsIfNotExist(allListings);
          console.log(`[Scheduler] Deep scrape saved ${saved} listings for ${search.city}`);

          if (saved > 0 && search.notifyEnabled) {
            await createNotification(
              search.userId,
              0,
              'new_listings',
              `${saved} new listings in ${search.city}`,
              `Deep scan found ${saved} new rental listings in ${search.city}, ${search.country}`
            );
          }
        }

        await updateLastScrapedAt(search.id);
      } catch (err) {
        console.error(`[Scheduler] Deep scrape error for ${search.city}:`, err);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Deep scrape job failed:', err);
  } finally {
    isRunningDeep = false;
  }
}

export function initScheduler() {
  console.log('[Scheduler] Initializing cron jobs...');

  cron.schedule('*/5 * * * *', () => {
    runFastScrape();
  });

  cron.schedule('*/30 * * * *', () => {
    runFullScrape();
  });

  cron.schedule('0 * * * *', () => {
    runDeepScrape();
  });

  console.log('[Scheduler] Cron jobs scheduled:');
  console.log('  - Fast scrape (Parse.bot): every 5 minutes');
  console.log('  - Full scrape (all sources): every 30 minutes');
  console.log('  - Deep scrape (Facebook, Playwright): every hour');
}
