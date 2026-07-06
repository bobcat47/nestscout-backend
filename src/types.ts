export interface ScrapedListing {
  externalId: string;
  source: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surfaceArea: number | null;
  images: string[];
  contactInfo: { name?: string; phone?: string; email?: string } | null;
  listingDate: Date;
  scrapedAt: Date;
}

export interface SearchFilters {
  city: string;
  country: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  minSurface?: number;
}

export interface SavedSearch {
  id: number;
  userId: string;
  city: string;
  country: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  isActive: boolean;
  notifyEnabled: boolean;
  lastScrapedAt: Date | null;
  createdAt: Date;
}
