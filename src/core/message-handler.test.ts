import { handleCommand } from './message-handler';
import { getUser, updateUserMeta } from '../users/user-service';

jest.mock('../users/user-service', () => ({
  getUser: jest.fn(),
  updateUserMeta: jest.fn(),
  getErrorHistory: jest.fn(),
  incrementErrorCount: jest.fn(),
  resetErrorCount: jest.fn(),
}));

jest.mock('../ai/openai-client', () => ({
    getCorrection: jest.fn(),
    getPracticeExercise: jest.fn(),
    }));

describe('handleCommand', () => {
  const mockGetUser = getUser as jest.Mock;
  const mockUpdateUserMeta = updateUserMeta as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set the target language when /language command is used with an argument', async () => {
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

  it('should inform the user of the current language if /language is used without an argument', async () => {
    const userId = 123;
    const user = { id: userId, targetLanguage: 'French' };
    mockGetUser.mockResolvedValue(user);

    const result = await handleCommand(userId, '/language');

    expect(result).toBe('Your current target language is: "French". Use /language [language] to set a new one.');
    expect(mockUpdateUserMeta).not.toHaveBeenCalled();
  });

  it('should inform the user that no language is set if /language is used without an argument and no language is set', async () => {
    const userId = 123;
    const user = { id: userId, targetLanguage: '' };
    mockGetUser.mockResolvedValue(user);

    const result = await handleCommand(userId, '/language');

    expect(result).toBe('You have not set a target language yet. Use /language [language] to set a new one.');
    expect(mockUpdateUserMeta).not.toHaveBeenCalled();
  });

  it('should prompt the user to set a language for commands other than /start and /language if not set', async () => {
    const userId = 123;
    const user = { id: userId, targetLanguage: '' };
    mockGetUser.mockResolvedValue(user);

    const result = await handleCommand(userId, '/practice');

    expect(result).toBe('Please set your target language first using the /language command (e.g., /language Spanish).');
  });

  it('should return the welcome message for /start and hint to set the language', async () => {
    const userId = 123;
    const user = { id: userId, targetLanguage: '' };
    mockGetUser.mockResolvedValue(user);

    const result = await handleCommand(userId, '/start');

    expect(result).toContain("Welcome, language learner!");
    expect(result).toContain("Please start by setting your target language with the /language command");
  });

  it('should return the welcome message for /start and show the current language', async () => {
    const userId = 123;
    const user = { id: userId, targetLanguage: 'German' };
    mockGetUser.mockResolvedValue(user);

    const result = await handleCommand(userId, '/start');

    expect(result).toContain("Welcome, language learner!");
    expect(result).toContain("Your current target language is German.");
  });
});
