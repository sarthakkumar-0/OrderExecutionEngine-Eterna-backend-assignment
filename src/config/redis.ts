import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis;
let connection: Redis;
let redisOptions: any;

if (REDIS_URL) {
  // Prefer a full URL (supports redis:// and rediss://)
  redis = new Redis(REDIS_URL);
  connection = new Redis(REDIS_URL);
  redisOptions = { url: REDIS_URL };
} else {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  redisOptions = {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
  };

  redis = new Redis(redisOptions);
  connection = new Redis(redisOptions);
}

export { redis, connection, redisOptions };