import { processMessage } from './correction-pipeline';
import { getUser, incrementErrorCount, resetErrorCount } from '../users/user-service';
import { getRedisClient } from '../infra/redis-client';
import { getCorrection } from '../ai/openai-client';

// Mock dependencies
jest.mock('../users/user-service');
jest.mock('../infra/redis-client');
jest.mock('../ai/openai-client');

const mockGetUser = getUser as jest.Mock;
const mockIncrementErrorCount = incrementErrorCount as jest.Mock;
const mockResetErrorCount = resetErrorCount as jest.Mock;
const mockGetRedisClient = getRedisClient as jest.Mock;
const mockGetCorrection = getCorrection as jest.Mock;

describe('processMessage', () => {
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

    mockGetUser.mockResolvedValue({
      id: 123,
      targetLanguage: 'English',
      nativeLanguage: 'Portuguese (Brazilian)',
      context: 'travel',
    });
  });

  test('should return a conversational reply for a correct message', async () => {
    const correctionResponse = {
      corrected: 'I am going to the beach.',
      explanation: '',
      errorType: null,
      reply: 'That sounds fun! The weather is perfect for it.',
    };
    mockGetCorrection.mockResolvedValue(correctionResponse);
    mockRedis.get.mockResolvedValue(null); // Cache miss

    const response = await processMessage(123, 'I am going to the beach.');

    expect(response).toBe('🤖 That sounds fun! The weather is perfect for it.');
    expect(mockGetCorrection).toHaveBeenCalledWith('I am going to the beach.', 'English', 'travel');
    expect(mockRedis.set).toHaveBeenCalled();
    expect(mockIncrementErrorCount).not.toHaveBeenCalled();
  });

  test('should return a correction without reinforcement if threshold is not met', async () => {
    const correctionResponse = {
      corrected: 'I went to the store.',
      explanation: "The past tense of 'go' is 'went'.",
      errorType: 'tense',
      reply: 'What did you buy?',
    };
    mockGetCorrection.mockResolvedValue(correctionResponse);
    mockRedis.get.mockResolvedValue(null); // Cache miss
    mockIncrementErrorCount.mockResolvedValue(1); // Below threshold

    const response = await processMessage(123, 'I go to the store yesterday.');

    expect(response).toContain('Correction: "I went to the store."');
    expect(response).toContain("Explanation: The past tense of 'go' is 'went'.");
    expect(response).toContain('Error Type: tense');
    expect(response).toContain('🤖 What did you buy?');
    expect(response).not.toContain("You've made this type of error a few times.");
    expect(mockIncrementErrorCount).toHaveBeenCalledWith(123, 'tense');
    expect(mockResetErrorCount).not.toHaveBeenCalled();
  });

  test('should trigger reinforcement when error threshold is reached', async () => {
    const correctionResponse = {
      corrected: 'I am interested in movies.',
      explanation: "Use 'in' for interests.",
      errorType: 'preposition',
      reply: 'What kind of movies do you like?',
    };
    mockGetCorrection.mockResolvedValue(correctionResponse);
    mockRedis.get.mockResolvedValue(null); // Cache miss
    mockIncrementErrorCount.mockResolvedValue(3); // Threshold reached

    const response = await processMessage(123, 'I am interested on movies.');

    expect(response).toContain("You've made this type of error a few times.");
    expect(response).toContain('Focus Area: preposition');
    expect(response).toContain('Correction: "I am interested in movies."');
    expect(mockIncrementErrorCount).toHaveBeenCalledWith(123, 'preposition');
    expect(mockResetErrorCount).toHaveBeenCalledWith(123, 'preposition');
  });

  test('should return a cached correction without calling the AI', async () => {
    const cachedCorrection = {
      corrected: 'He is a doctor.',
      explanation: "'An' is used before vowel sounds, 'a' before consonant sounds.",
      errorType: 'grammar',
      reply: 'What does he specialize in?',
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedCorrection));

    const response = await processMessage(123, 'He is an doctor.');

    expect(response).toContain('Correction: "He is a doctor."');
    expect(mockGetCorrection).not.toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalledWith('correction:he is an doctor.');
    expect(mockIncrementErrorCount).toHaveBeenCalledWith(123, 'grammar');
  });
  
  test('should handle AI client failure gracefully', async () => {
    mockGetCorrection.mockResolvedValue(null);
    mockRedis.get.mockResolvedValue(null);

    const response = await processMessage(123, 'Some message.');

    expect(response).toBe("I'm sorry, I couldn't process your message at the moment.");
  });
});
