import { db } from '../db';
import { notifications } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { broadcastToUser } from '../websocket';

export async function createNotification(
  userId: string,
  listingId: number,
  type: string,
  title: string,
  message: string
) {
  const result = await db
    .insert(notifications)
    .values({
      userId,
      listingId,
      type,
      title,
      message,
      isRead: false,
    })
    .returning();

  const notification = result[0];

  // Broadcast via WebSocket
  try {
    broadcastToUser(userId, {
      type: 'notification',
      data: notification,
    });
  } catch {
    // WebSocket may not be connected
  }

  return notification;
}

export async function getNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    )
    .orderBy(desc(notifications.createdAt));
}

export async function markAsRead(id: number) {
  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id))
    .returning();

  return result[0] || null;
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return { updated: true };
}
