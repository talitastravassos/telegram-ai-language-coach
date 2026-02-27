import { handleCommand, handleTextMessage } from './message-handler';
import { getUser, updateUserMeta, getErrorHistory } from '../users/user-service';
import { processMessage } from './correction-pipeline';
import { getPracticeExercise } from '../ai/openai-client';

jest.mock('../users/user-service', () => ({
  getUser: jest.fn(),
  updateUserMeta: jest.fn(),
  getErrorHistory: jest.fn(),
}));

jest.mock('./correction-pipeline', () => ({
  processMessage: jest.fn(),
}));

jest.mock('../ai/openai-client', () => ({
  getPracticeExercise: jest.fn(),
}));

describe('Message Handler', () => {
  const mockGetUser = getUser as jest.Mock;
  const mockUpdateUserMeta = updateUserMeta as jest.Mock;
  const mockGetErrorHistory = getErrorHistory as jest.Mock;
  const mockProcessMessage = processMessage as jest.Mock;
  const mockGetPracticeExercise = getPracticeExercise as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTextMessage', () => {
    it('should forward message to correction pipeline if target language is set', async () => {
      const userId = 123;
      const user = { id: userId, targetLanguage: 'English' };
      mockGetUser.mockResolvedValue(user);
      mockProcessMessage.mockResolvedValue('Corrected message');

      const result = await handleTextMessage(userId, 'some message');

      expect(result).toBe('Corrected message');
      expect(mockProcessMessage).toHaveBeenCalledWith(userId, 'some message');
    });

    it('should prompt user to set language if target language is not set', async () => {
      const userId = 123;
      const user = { id: userId, targetLanguage: '' };
      mockGetUser.mockResolvedValue(user);

      const result = await handleTextMessage(userId, 'some message');

      expect(result).toContain('Please set your target language first');
      expect(mockProcessMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleCommand', () => {
    it('should handle /language command with argument', async () => {
        const userId = 123;
        const initialUser = { id: userId, targetLanguage: '' };
        mockGetUser.mockResolvedValue(initialUser);

        const result = await handleCommand(userId, '/language Spanish');

        expect(result).toBe('Target language set to: "Spanish"');
        expect(mockUpdateUserMeta).toHaveBeenCalledWith({
            id: userId,
            targetLanguage: 'Spanish',
        });
    });
    
    it('should handle /language command without argument when language is set', async () => {
        const userId = 123;
        const user = { id: userId, targetLanguage: 'French' };
        mockGetUser.mockResolvedValue(user);

        const result = await handleCommand(userId, '/language');

        expect(result).toBe('Your current target language is: "French". Use /language [language] to set a new one.');
    });

    it('should handle /progress command with history', async () => {
      const userId = 123;
      const user = { id: userId, targetLanguage: 'English' };
      mockGetUser.mockResolvedValue(user);
      mockGetErrorHistory.mockResolvedValue({ tense: 2, grammar: 1 });

      const result = await handleCommand(userId, '/progress');

      expect(result).toContain("Here's your progress report:");
      expect(result).toContain('- tense: 2 time(s)');
      expect(result).toContain('- grammar: 1 time(s)');
    });

    it('should handle /progress command with no history', async () => {
        const userId = 123;
        const user = { id: userId, targetLanguage: 'English' };
        mockGetUser.mockResolvedValue(user);
        mockGetErrorHistory.mockResolvedValue({});
  
        const result = await handleCommand(userId, '/progress');
  
        expect(result).toBe("You haven't made any recorded mistakes yet. Keep practicing!");
      });

    it('should handle /practice command successfully', async () => {
      const userId = 123;
      const user = { id: userId, targetLanguage: 'English' };
      mockGetUser.mockResolvedValue(user);
      mockGetErrorHistory.mockResolvedValue({ tense: 1 });
      mockGetPracticeExercise.mockResolvedValue({
        type: 'fill_in_the_blank',
        sentence: 'I ___ to the store.',
        correct_answer: 'went',
      });

      const result = await handleCommand(userId, '/practice');

      expect(result).toContain('Let\'s practice! (fill in the blank)');
    });

    it('should handle /practice command with translation exercise', async () => {
        const userId = 123;
        const user = { id: userId, targetLanguage: 'English' };
        mockGetUser.mockResolvedValue(user);
        mockGetErrorHistory.mockResolvedValue({ tense: 1 });
        mockGetPracticeExercise.mockResolvedValue({
          type: 'translation',
          sentence: 'Olá',
          correct_answer: 'Olá',
        });
  
        const result = await handleCommand(userId, '/practice');
  
        expect(result).toContain('Let\'s practice! Try translating this to English');
        expect(result).toContain('"Olá"');
      });

    it('should handle /practice command when exercise generation fails', async () => {
        const userId = 123;
        const user = { id: userId, targetLanguage: 'English' };
        mockGetUser.mockResolvedValue(user);
        mockGetErrorHistory.mockResolvedValue({ tense: 1 });
        mockGetPracticeExercise.mockResolvedValue(null);

        const result = await handleCommand(userId, '/practice');

        expect(result).toBe("I couldn't generate an exercise for you right now. Please try again later.");
    });

    it('should handle /context command with new context', async () => {
      const userId = 123;
      const user = { id: userId, targetLanguage: 'English', context: '' };
      mockGetUser.mockResolvedValue(user);

      const result = await handleCommand(userId, '/context travel');

      expect(result).toBe('Context set to: "travel"');
      expect(mockUpdateUserMeta).toHaveBeenCalledWith({ ...user, context: 'travel' });
    });

    it('should handle /context command to show current context', async () => {
        const userId = 123;
        const user = { id: userId, targetLanguage: 'English', context: 'business' };
        mockGetUser.mockResolvedValue(user);
  
        const result = await handleCommand(userId, '/context');
  
        expect(result).toBe('Current context is: "business"');
      });

      it('should handle /context command when no context is set', async () => {
        const userId = 123;
        const user = { id: userId, targetLanguage: 'English', context: undefined };
        mockGetUser.mockResolvedValue(user);
  
        const result = await handleCommand(userId, '/context');
  
        expect(result).toBe('No context is currently set. Use /context [topic] to set one.');
      });

    it('should handle unknown command', async () => {
      const userId = 123;
      const user = { id: userId, targetLanguage: 'English' };
      mockGetUser.mockResolvedValue(user);

      const result = await handleCommand(userId, '/unknown');

      expect(result).toBe('Unknown command: "/unknown". Try /start to see what I can do.');
    });
  });
});
