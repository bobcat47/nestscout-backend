import { Router } from 'express';
import {
  draftContactMessage,
  queueContact,
  getContactStatus,
} from '../services/ai-agent.service';
import { getListingById } from '../services/listing.service';

const router = Router();

router.post('/contact', async (req, res) => {
  try {
    const { listingId, userMessage, preferences } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const id = Number(listingId);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid listingId' });
    }

    const listing = await getListingById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const userId = (req.headers['x-user-id'] as string) || 'anonymous';

    const { message, metadata } = await draftContactMessage(
      {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        currency: listing.currency,
        city: listing.city,
        bedrooms: listing.bedrooms,
        surfaceArea: listing.surfaceArea,
      },
      preferences || {
        language: 'en',
        tone: 'professional',
        includeDetails: true,
        maxLength: 500,
      }
    );

    const finalMessage = userMessage || message;
    const queueItem = await queueContact(id, userId, finalMessage);

    res.json({
      draftedMessage: message,
      finalMessage,
      queueItem,
      metadata,
    });
  } catch (err) {
    console.error('Error in agent contact:', err);
    res.status(500).json({ error: 'Failed to process contact request' });
  }
});

router.get('/contact/status', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const status = await getContactStatus(userId);
    res.json(status);
  } catch (err) {
    console.error('Error fetching contact status:', err);
    res.status(500).json({ error: 'Failed to fetch contact status' });
  }
});

export default router;
