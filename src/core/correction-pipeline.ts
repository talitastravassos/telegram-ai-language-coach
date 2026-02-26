import { CorrectionResponse, getCorrection } from '../ai/openai-client';
import { getRedisClient } from '../infra/redis-client';
import {
  getUser,
  incrementErrorCount,
  resetErrorCount,
} from '../users/user-service';

const CACHE_PREFIX = 'correction:';
const REINFORCEMENT_THRESHOLD = 3;

// This function now returns whether the reinforcement trigger was activated
const logError = async (
  userId: number,
  errorType: string,
): Promise<{ triggered: boolean }> => {
  const newCount = await incrementErrorCount(userId, errorType);
  console.log(
    `Logged error '${errorType}' for user ${userId}. New count: ${newCount}`,
  );

  if (newCount >= REINFORCEMENT_THRESHOLD) {
    console.log(
      `Reinforcement triggered for user ${userId} on error type '${errorType}'`,
    );
    await resetErrorCount(userId, errorType);
    return { triggered: true };
  }

  return { triggered: false };
};

const formatResponse = (correction: CorrectionResponse): string => {
  if (correction.errorType === null) {
    return `"${correction.corrected}" is correct! Keep it up.`;
  }

  return `🤔
Correction: "${correction.corrected}"
Explanation: ${correction.explanation}
Error Type: ${correction.errorType}`;
};

const generateReinforcementMessage = (errorType: string): string => {
  let extraInfo = '';
  switch (errorType) {
    case 'tense':
      extraInfo =
        "Tenses tell you when an action happens (e.g., 'I walk' vs. 'I walked'). Let's focus on getting them right!";
      break;
    case 'preposition':
      extraInfo =
        "Prepositions like 'in', 'on', 'at' show relationships. They often require practice.";
      break;
    case 'word_choice':
      extraInfo =
        'Choosing the most accurate word is key. Similar words can have very different meanings.';
      break;
    default:
      extraInfo =
        'Grammar rules can be complex, but mastering them makes a big difference.';
  }

  return `🔔 You've made this type of error a few times. Let's focus on it!\n\n**Focus Area: ${errorType.replace('_', ' ')}**\n${extraInfo}`;
};

export const processMessage = async (
  userId: number,
  text: string,
): Promise<string> => {
  const user = await getUser(userId);
  const redis = getRedisClient();
  const cacheKey = `${CACHE_PREFIX}${text.trim().toLowerCase()}`;

  let correction: CorrectionResponse | null;
  let reinforcementMessage: string | null = null;

  const cachedCorrection = await redis.get(cacheKey);
  if (cachedCorrection) {
    console.log(`Cache hit for message: "${text}"`);
    correction = JSON.parse(cachedCorrection) as CorrectionResponse;
  } else {
    console.log(`Cache miss for message: "${text}". Calling AI.`);
    correction = await getCorrection(
      text,
      user.targetLanguage,
      user.nativeLanguage,
    );
  }

  if (!correction) {
    return "I'm sorry, I couldn't process your message at the moment.";
  }

  if (correction.errorType) {
    const { triggered } = await logError(user.id, correction.errorType);
    if (triggered) {
      reinforcementMessage = generateReinforcementMessage(correction.errorType);
    }
  }

  if (!cachedCorrection) {
    await redis.set(cacheKey, JSON.stringify(correction), 'EX', 3600);
  }

  const regularResponse = formatResponse(correction);
  return reinforcementMessage
    ? `${reinforcementMessage}\n\n${regularResponse}`
    : regularResponse;
};
