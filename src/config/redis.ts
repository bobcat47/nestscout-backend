// Simple in-memory fallback if Redis not configured
class MemoryStore {
  private store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) || null; }
  async set(key: string, value: string) { this.store.set(key, value); }
  async del(key: string) { this.store.delete(key); }
}

let redis: any;
try {
  if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    redis = createClient({ url: process.env.REDIS_URL });
    redis.connect();
  } else {
    redis = new MemoryStore();
  }
} catch {
  redis = new MemoryStore();
}

export { redis };
