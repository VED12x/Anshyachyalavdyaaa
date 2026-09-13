import Redis from 'ioredis';
import { config } from '../config';

// Main Redis client for caching and general operations
export const redisClient = new Redis(config.redisUrl, {
  retryStrategy: (times: number) => {
    if (times > 10) return null; // Stop retrying after 10 attempts
    return Math.min(times * 200, 2000);
  },
  maxRetriesPerRequest: 3,
});

// Separate client for pub/sub (Redis requires dedicated connections for subscriptions)
export const redisPub = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);

redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));

// --- Token Denylist (for logout) ---

/**
 * Add a refresh token to the denylist in Redis.
 * Token is stored with a TTL matching the refresh token expiry (7 days).
 */
export async function denylistToken(token: string, expiresInSeconds: number = 7 * 24 * 60 * 60): Promise<void> {
  await redisClient.set(`denylist:${token}`, '1', 'EX', expiresInSeconds);
}

/**
 * Check if a refresh token has been denylisted (logged out).
 */
export async function isTokenDenylisted(token: string): Promise<boolean> {
  const result = await redisClient.get(`denylist:${token}`);
  return result === '1';
}

// --- Pub/Sub Helpers ---

export const CHANNELS = {
  GLUCOSE_NEW_READING: 'glucose.new_reading',
  ALERT_CREATED: 'alert.created',
  MESSAGE_SENT: 'message.sent',
} as const;

/**
 * Publish an event to a Redis channel.
 */
export async function publishEvent(channel: string, data: Record<string, any>): Promise<void> {
  await redisPub.publish(channel, JSON.stringify(data));
}

/**
 * Subscribe to a Redis channel and call handler on each message.
 */
export function subscribeToChannel(channel: string, handler: (data: any) => void): void {
  redisSub.subscribe(channel);
  redisSub.on('message', (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const data = JSON.parse(message);
        handler(data);
      } catch (err) {
        console.error(`Error parsing message from ${channel}:`, err);
      }
    }
  });
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  await redisClient.quit();
  await redisPub.quit();
  await redisSub.quit();
}
