/**
 * Extract numeric price from various string formats:
 * "€1.200", "1200 EUR", "1,200 €", "EUR 1,200.50", etc.
 */
export function extractPrice(priceInput: string | number | undefined | null): number {
  if (typeof priceInput === 'number') return priceInput;
  if (!priceInput) return 0;

  const cleaned = String(priceInput)
    .replace(/[€£$]/g, '')
    .replace(/\s*(EUR|GBP|USD)\s*/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')
    .trim();

  const match = cleaned.match(/[\d.]+/);
  if (!match) return 0;

  const val = parseFloat(match[0]);
  return isNaN(val) ? 0 : val;
}

/**
 * Extract surface area (m²) from a text string.
 * Matches patterns like "120 m²", "120m2", "120 sqm", "120 square meters"
 */
export function extractSurface(text: string | null | undefined): number | null {
  if (!text) return null;

  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*m[²2\s]/i,
    /(\d+(?:[.,]\d+)?)\s*sqm/i,
    /(\d+(?:[.,]\d+)?)\s*square\s*meters?/i,
    /(\d+(?:[.,]\d+)?)\s*meters?\s*squared/i,
    /superficie\s*:?\s*(\d+(?:[.,]\d+)?)/i,
    /surface\s*:?\s*(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*mq/i,
    /(\d+(?:[.,]\d+)?)\sm²/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val) && val > 5 && val < 50000) {
        return Math.round(val);
      }
    }
  }

  return null;
}

/**
 * Infer currency code from country name.
 */
export function inferCurrency(country: string): string {
  const map: Record<string, string> = {
    spain: 'EUR',
    france: 'EUR',
    germany: 'EUR',
    italy: 'EUR',
    portugal: 'EUR',
    netherlands: 'EUR',
    belgium: 'EUR',
    austria: 'EUR',
    ireland: 'EUR',
    uk: 'GBP',
    'united kingdom': 'GBP',
    england: 'GBP',
    scotland: 'GBP',
    wales: 'GBP',
    switzerland: 'CHF',
    sweden: 'SEK',
    norway: 'NOK',
    denmark: 'DKK',
    poland: 'PLN',
    czechia: 'CZK',
    'czech republic': 'CZK',
    hungary: 'HUF',
    romania: 'RON',
    croatia: 'EUR',
  };

  return map[country.toLowerCase().trim()] || 'EUR';
}
