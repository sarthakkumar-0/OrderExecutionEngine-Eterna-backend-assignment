import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const redis = new Redis(redisConfig);

export const connection = new Redis({
    ...redisConfig,
    maxRetriesPerRequest: null,
});
