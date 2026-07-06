import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { parse } from 'url';

const clients = new Map<string, WebSocket>();

function extractUserId(req: IncomingMessage): string {
  try {
    const parsed = parse(req.url || '', true);
    const userId = parsed.query.userId as string;
    if (userId) return userId;

    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string') {
      return authHeader.replace('Bearer ', '').slice(0, 50);
    }
  } catch {
    // ignore
  }
  return 'anonymous';
}

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const userId = extractUserId(req);
    clients.set(userId, ws);

    console.log(`[WebSocket] Client connected: ${userId}`);

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'NestScout WebSocket connected',
        userId,
      })
    );

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        if (message.type === 'subscribe' && message.searchId) {
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              searchId: message.searchId,
            })
          );
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`[WebSocket] Client disconnected: ${userId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket] Error for ${userId}:`, err);
      clients.delete(userId);
    });
  });

  console.log('[WebSocket] Server setup complete');
}

export function broadcastToUser(userId: string, data: any) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error(`[WebSocket] Failed to send to ${userId}:`, err);
    }
  }
}

export function broadcastToAll(data: any) {
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch {
        // ignore send errors
      }
    }
  });
}

export { clients };
