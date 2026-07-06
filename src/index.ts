import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

import listingsRoutes from './routes/listings.routes';
import searchesRoutes from './routes/searches.routes';
import notificationsRoutes from './routes/notifications.routes';
import agentRoutes from './routes/agent.routes';
import { setupWebSocket } from './websocket';
import { initScheduler } from './services/scheduler.service';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/live' });

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/listings', listingsRoutes);
app.use('/api/searches', searchesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/agent', agentRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket
setupWebSocket(wss);

// Scheduler
initScheduler();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 NestScout API running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws/live`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
