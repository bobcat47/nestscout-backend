import { Router } from 'express';
import {
  createSearch,
  getSearches,
  toggleSearch,
  deleteSearch,
} from '../services/search.service';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { city, country, minPrice, maxPrice, bedrooms } = req.body;

    if (!city || !country) {
      return res.status(400).json({ error: 'City and country are required' });
    }

    const userId = (req.headers['x-user-id'] as string) || 'anonymous';

    const search = await createSearch(userId, {
      city,
      country,
      minPrice,
      maxPrice,
      bedrooms,
    });

    res.status(201).json(search);
  } catch (err) {
    console.error('Error creating search:', err);
    res.status(500).json({ error: 'Failed to create search' });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const searches = await getSearches(userId);
    res.json(searches);
  } catch (err) {
    console.error('Error fetching searches:', err);
    res.status(500).json({ error: 'Failed to fetch searches' });
  }
});

router.put('/:id/toggle', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid search ID' });
    }

    const search = await toggleSearch(id);
    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    res.json(search);
  } catch (err) {
    console.error('Error toggling search:', err);
    res.status(500).json({ error: 'Failed to toggle search' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid search ID' });
    }

    await deleteSearch(id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting search:', err);
    res.status(500).json({ error: 'Failed to delete search' });
  }
});

export default router;
