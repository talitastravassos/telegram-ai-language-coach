import { getRedisClient } from '../infra/redis-client';

const USER_META_PREFIX = 'user:meta:';
const USER_ERRORS_PREFIX = 'user:errors:';

export interface User {
  id: number;
  targetLanguage: string;
  nativeLanguage: string;
  context?: string;
}

// Manages basic user info (e.g., language preference)
export const getUser = async (userId: number): Promise<User> => {
  const client = getRedisClient();
  const userKey = `${USER_META_PREFIX}${userId}`;
  const storedUser = await client.get(userKey);

  const defaults = {
    id: userId,
    targetLanguage: '',
    nativeLanguage: 'Portuguese (Brazilian)',
  };

  if (storedUser) {
    const parsed = JSON.parse(storedUser);
    return { ...defaults, ...parsed };
  }

  // Create a new user if one doesn't exist
  const newUser: User = { ...defaults };
  await client.set(userKey, JSON.stringify(newUser));
  return newUser;
};

// Saves changes to a user's metadata (like context or language)
export const updateUserMeta = async (user: User): Promise<void> => {
  const client = getRedisClient();
  const userKey = `${USER_META_PREFIX}${user.id}`;
  await client.set(userKey, JSON.stringify(user));
};

// Atomically increments the count for a specific error type using a Redis Hash
export const incrementErrorCount = async (
  userId: number,
  errorType: string,
): Promise<number> => {
  const client = getRedisClient();
  const errorsKey = `${USER_ERRORS_PREFIX}${userId}`;
  const newCount = await client.hincrby(errorsKey, errorType, 1);
  return newCount;
};

// Retrieves the full error history for a user from the Redis Hash
export const getErrorHistory = async (
  userId: number,
): Promise<Record<string, number>> => {
  const client = getRedisClient();
  const errorsKey = `${USER_ERRORS_PREFIX}${userId}`;
  const history = await client.hgetall(errorsKey);

  // hgetall returns string values, so parse them to numbers
  const parsedHistory: Record<string, number> = {};
  for (const key in history) {
    parsedHistory[key] = parseInt(history[key] || '0', 10);
  }
  return parsedHistory;
};

// Resets a specific error count for a user back to 0.
export const resetErrorCount = async (
  userId: number,
  errorType: string,
): Promise<void> => {
  const client = getRedisClient();
  const errorsKey = `${USER_ERRORS_PREFIX}${userId}`;
  await client.hset(errorsKey, errorType, '0');
};
