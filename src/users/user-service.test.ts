import {
  getUser,
  updateUserMeta,
  incrementErrorCount,
  getErrorHistory,
  resetErrorCount,
  User,
} from './user-service';
import { getRedisClient } from '../infra/redis-client';

// Mock dependencies
jest.mock('../infra/redis-client');

const mockGetRedisClient = getRedisClient as jest.Mock;

describe('UserService', () => {
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    hgetall: jest.Mock;
    hincrby: jest.Mock;
    hset: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      hgetall: jest.fn(),
      hincrby: jest.fn(),
      hset: jest.fn(),
    };
    mockGetRedisClient.mockReturnValue(mockRedis);
  });

  describe('getUser', () => {
    it('should return a new user with defaults if none is found', async () => {
      mockRedis.get.mockResolvedValue(null);
      const userId = 123;

      const user = await getUser(userId);

      expect(user).toEqual({
        id: userId,
        targetLanguage: '',
        nativeLanguage: 'Portuguese (Brazilian)',
      });
      expect(mockRedis.get).toHaveBeenCalledWith(`user:meta:${userId}`);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `user:meta:${userId}`,
        JSON.stringify({
          id: userId,
          targetLanguage: '',
          nativeLanguage: 'Portuguese (Brazilian)',
        }),
      );
    });

    it('should return an existing user from cache', async () => {
      const userId = 456;
      const storedUser: User = {
        id: userId,
        targetLanguage: 'Spanish',
        nativeLanguage: 'Portuguese (Brazilian)',
        context: 'work',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(storedUser));

      const user = await getUser(userId);

      expect(user).toEqual(storedUser);
      expect(mockRedis.get).toHaveBeenCalledWith(`user:meta:${userId}`);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('updateUserMeta', () => {
    it('should save user metadata to redis', async () => {
      const user: User = {
        id: 789,
        targetLanguage: 'French',
        nativeLanguage: 'Portuguese (Brazilian)',
        context: 'food',
      };

      await updateUserMeta(user);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `user:meta:${user.id}`,
        JSON.stringify(user),
      );
    });
  });

  describe('incrementErrorCount', () => {
    it('should increment the error count for a user', async () => {
      const userId = 111;
      const errorType = 'tense';
      mockRedis.hincrby.mockResolvedValue(3);

      const newCount = await incrementErrorCount(userId, errorType);

      expect(newCount).toBe(3);
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        `user:errors:${userId}`,
        errorType,
        1,
      );
    });
  });

  describe('getErrorHistory', () => {
    it('should retrieve and parse the error history', async () => {
      const userId = 222;
      const history = {
        tense: '5',
        preposition: '2',
      };
      mockRedis.hgetall.mockResolvedValue(history);

      const parsedHistory = await getErrorHistory(userId);

      expect(parsedHistory).toEqual({
        tense: 5,
        preposition: 2,
      });
      expect(mockRedis.hgetall).toHaveBeenCalledWith(`user:errors:${userId}`);
    });
  });

  describe('resetErrorCount', () => {
    it('should reset a specific error count to 0', async () => {
      const userId = 333;
      const errorType = 'word_choice';

      await resetErrorCount(userId, errorType);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        `user:errors:${userId}`,
        errorType,
        '0',
      );
    });
  });
});
