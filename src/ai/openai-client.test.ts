process.env.OPENAI_API_KEY = 'test-key';

const mockCreateCompletion = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  }));
});

import type { CorrectionResponse, PracticeExercise } from './openai-client';
import { getCorrection, getPracticeExercise } from './openai-client';

jest.mock('./prompts/correction', () => ({
  correctionPrompt:
    'Correction prompt: {message} {targetLanguage} {nativeLanguage} {context}',
}));
jest.mock('./prompts/practice', () => ({
  practicePrompt:
    'Practice prompt: {targetLanguage} {nativeLanguage} {errorType}',
}));

describe('OpenAI Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockCreateCompletion.mockClear();
  });

  describe('getCorrection', () => {
    it('should return a CorrectionResponse on successful API call', async () => {
      const mockResponse: CorrectionResponse = {
        corrected: 'Correct sentence.',
        explanation: 'Explanation.',
        errorType: 'grammar',
        reply: 'Good job!',
      };
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await getCorrection(
        'Wrong sentence.',
        'English',
        'general',
      );

      expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should return null if AI response content is null', async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await getCorrection('test message', 'English');
      expect(result).toBeNull();
    });

    it('should return null on API call error', async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error('API Error'));

      const result = await getCorrection('test message', 'English');
      expect(result).toBeNull();
    });
  });

  describe('getPracticeExercise', () => {
    it('should return a PracticeExercise on successful API call', async () => {
      const mockResponse: PracticeExercise = {
        type: 'translation',
        sentence: 'Hello',
        correct_answer: 'Olá',
      };
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await getPracticeExercise('Spanish', 'grammar');

      expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should return null if AI response content is null', async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await getPracticeExercise('Spanish');
      expect(result).toBeNull();
    });

    it('should return null on API call error', async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error('API Error'));

      const result = await getPracticeExercise('Spanish');
      expect(result).toBeNull();
    });
  });
});
