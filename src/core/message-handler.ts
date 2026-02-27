import { getPracticeExercise } from '../ai/openai-client';
import {
  getErrorHistory,
  getUser,
  updateUserMeta,
} from '../users/user-service';
import { processMessage } from './correction-pipeline';

const NO_LANGUAGE_SET_MESSAGE =
  'Please set your target language first using the /language command (e.g., /language Spanish).';

export const handleTextMessage = async (
  userId: number,
  text: string,
): Promise<string> => {
  const user = await getUser(userId);
  if (!user.targetLanguage) {
    return NO_LANGUAGE_SET_MESSAGE;
  }

  console.log(`Routing message from user ${userId} to correction pipeline.`);
  return processMessage(userId, text);
};

export const handleCommand = async (
  userId: number,
  text: string,
): Promise<string> => {
  console.log(`Processing command from user ${userId}: "${text}"`);

  const parts = text.split(' ');
  const command = (parts[0] || '').toLowerCase();
  const args = parts.slice(1);

  const user = await getUser(userId);

  // Allow /start and /language even if language is not set
  if (!user.targetLanguage && !['/start', '/language'].includes(command)) {
    return NO_LANGUAGE_SET_MESSAGE;
  }

  switch (command) {
    case '/start':
      const welcomeMessage = `Welcome, language learner! I'm here to help you practice a new language.`;
      const languageHint = user.targetLanguage
        ? `Your current target language is ${user.targetLanguage}.`
        : `Please start by setting your target language with the /language command (e.g., /language Spanish).`;

      return `${welcomeMessage}
${languageHint}

Here are the commands you can use:
- Send me a message and I'll correct it.
- Use /progress to see your error history.
- Use /practice to get an exercise.
- Use /context [topic] to set a conversation topic.
- Use /language [language] to change your target language.`;

    case '/progress':
      const history = await getErrorHistory(userId);
      const errorEntries = Object.entries(history);

      if (
        errorEntries.length === 0 ||
        errorEntries.every((entry) => entry[1] === 0)
      ) {
        return "You haven't made any recorded mistakes yet. Keep practicing!";
      }

      const progressReport = errorEntries
        .filter((entry) => entry[1] > 0) // Only show errors with a count > 0
        .map(([type, count]) => `- ${type}: ${count} time(s)`)
        .join('\n');
      return `Here's your progress report:\n${progressReport}`;

    case '/practice':
      const errorHistory = await getErrorHistory(userId);
      const keys = Object.keys(errorHistory);
      const mostCommonError =
        keys.length > 0
          ? keys.reduce((a, b) =>
              (errorHistory[a] || 0) > (errorHistory[b] || 0) ? a : b,
            )
          : 'general';

      console.log(
        `Generating practice for user ${userId}, targeting error: ${mostCommonError}`,
      );
      const exercise = await getPracticeExercise(
        user.targetLanguage,
        mostCommonError,
      );

      if (!exercise) {
        return "I couldn't generate an exercise for you right now. Please try again later.";
      }

      if (exercise.sentence === exercise.correct_answer) {
        return `Let's practice! Try translating this to ${user.targetLanguage}:\n\n"${exercise.sentence}"`;
      }

      return `Let's practice! (${exercise.type.replace(
        /_/g,
        ' ',
      )})\n\n"${exercise.sentence}"`;

    case '/context':
      if (args.length > 0) {
        const newContext = args.join(' ');
        user.context = newContext;
        await updateUserMeta(user);
        return `Context set to: "${newContext}"`;
      } else {
        return user.context
          ? `Current context is: "${user.context}"`
          : 'No context is currently set. Use /context [topic] to set one.';
      }

    case '/language':
      if (args.length > 0) {
        const newLanguage = args.join(' ');
        user.targetLanguage = newLanguage;
        await updateUserMeta(user);
        return `Target language set to: "${newLanguage}"`;
      } else {
        const currentLanguage = user.targetLanguage
          ? `Your current target language is: "${user.targetLanguage}".`
          : 'You have not set a target language yet.';
        return `${currentLanguage} Use /language [language] to set a new one.`;
      }

    default:
      return `Unknown command: "${command}". Try /start to see what I can do.`;
  }
};
