const mockOn = jest.fn();
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: mockOn,
  }));
});

import Redis from 'ioredis';
import { getRedisClient } from './redis-client';

describe('Redis Client', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    mockOn.mockClear();
    (Redis as unknown as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should throw an error if REDIS_URL is not provided', () => {
    delete process.env.REDIS_URL;
    expect(() => getRedisClient()).toThrow(
      'REDIS_URL must be provided in .env',
    );
  });

  it('should create a new client and attach listeners on first call, and return same client on second call', () => {
    process.env.REDIS_URL = 'redis://test:6379';

    const client1 = getRedisClient();
    expect(Redis).toHaveBeenCalledTimes(1);
    expect(Redis).toHaveBeenCalledWith('redis://test:6379');
    expect(client1).toBeDefined();
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledTimes(2);

    const client2 = getRedisClient();
    expect(Redis).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledTimes(2);
    expect(client1).toBe(client2);
  });
});
