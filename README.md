# NestScout Backend

AI-powered apartment scanner — aggregates rental listings from Facebook Marketplace, Fotocasa, ImmoScout24, Idealista, and 6+ other European rental platforms.

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js + WebSocket
- **ORM**: Drizzle ORM + PostgreSQL
- **Cache**: Redis (with in-memory fallback)
- **Scraping**: Apify (pre-built actors) + Parse.bot (structured APIs) + Playwright (custom)
- **AI**: OpenAI GPT-4o-mini (auto-contact drafting)
- **Scheduler**: node-cron (3-tier: 5min / 30min / 1hr)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/health` | — | Server status |
| `GET /api/listings` | — | Search with filters (city, price, beds, source, page) |
| `GET /api/listings/:id` | — | Single listing |
| `POST /api/searches` | — | Save a search alert |
| `GET /api/searches` | — | List saved searches |
| `PUT /api/searches/:id/toggle` | — | Activate/pause search |
| `DELETE /api/searches/:id` | — | Delete search |
| `GET /api/notifications` | — | Get notifications |
| `PUT /api/notifications/:id/read` | — | Mark as read |
| `PUT /api/notifications/read-all` | — | Mark all read |
| `POST /api/agent/contact` | — | AI draft + queue contact |
| `GET /api/agent/contact/status` | — | Check contact queue |
| `WS /ws/live` | — | Real-time notifications |

## Environment Variables

```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/nestscout
REDIS_URL=redis://localhost:6379
APIFY_TOKEN=your_apify_token
PARSE_API_KEY=your_parsebot_key
SCRAPINGBEE_API_KEY=your_scrapingbee_key
OPENAI_API_KEY=your_openai_key
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL database and run migrations
npm run db:push

# 3. Start development server
npm run dev

# Server runs on http://localhost:3001
```

## Scrapers

| Source | Country | Platform | Speed |
|--------|---------|----------|-------|
| Facebook Marketplace | All | Apify | Slow (hourly) |
| Fotocasa | 🇪🇸 Spain | Apify | Medium |
| Rightmove | 🇬🇧 UK | Apify | Medium |
| Leboncoin | 🇫🇷 France | Apify | Medium |
| ImmoScout24 | 🇩🇪 Germany | Parse.bot API | **Fast (5min)** |
| Immowelt | 🇩🇪 Germany | Parse.bot API | **Fast (5min)** |
| Zoopla | 🇬🇧 UK | Parse.bot API | **Fast (5min)** |
| Immobiliare.it | 🇮🇹 Italy | Parse.bot API | **Fast (5min)** |
| Idealista | 🇪🇸🇵🇹🇮🇹 | Playwright | Slow (hourly) |
| Subito.it | 🇮🇹 Italy | Playwright | Slow (hourly) |

## Scheduler

| Tier | Frequency | Sources |
|------|-----------|---------|
| Fast | Every 5 min | Parse.bot APIs |
| Full | Every 30 min | All sources |
| Deep | Every 1 hour | Facebook + Playwright |
