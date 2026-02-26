import Redis from 'ioredis';

let redis: Redis;

export const getRedisClient = (): Redis => {
    if (!redis) {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL must be provided in .env');
        }
        redis = new Redis(process.env.REDIS_URL);

        redis.on('error', (err) => {
            console.error('Redis error:', err);
        });

        redis.on('connect', () => {
            console.log('Connected to Redis');
        });
    }
    return redis;
};
