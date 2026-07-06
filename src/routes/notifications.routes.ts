import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const notifications = await getNotifications(userId);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notification = await markAsRead(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const result = await markAllAsRead(userId);
    res.json(result);
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router;
