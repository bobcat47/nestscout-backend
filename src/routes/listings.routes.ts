import { Router } from 'express';
import { getListings, getListingById } from '../services/listing.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const {
      city,
      country,
      minPrice,
      maxPrice,
      bedrooms,
      source,
      page,
      limit,
    } = req.query;

    const filters = {
      city: city as string | undefined,
      country: country as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      source: source as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };

    const result = await getListings(filters);
    res.json(result);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid listing ID' });
    }

    const listing = await getListingById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (err) {
    console.error('Error fetching listing:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

export default router;
