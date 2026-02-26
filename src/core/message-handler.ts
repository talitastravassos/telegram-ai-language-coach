// src/core/message-handler.ts
import { processMessage } from './correction-pipeline';
import { getErrorHistory, getUser, updateUserMeta } from '../users/user-service';
import { getPracticeExercise } from '../ai/gemini-client';

export const handleTextMessage = async (userId: number, text: string): Promise<string> => {
    console.log(`Routing message from user ${userId} to correction pipeline.`);
    return processMessage(userId, text);
};

export const handleCommand = async (userId: number, text: string): Promise<string> => {
    console.log(`Processing command from user ${userId}: "${text}"`);
    
    const parts = text.split(' ');
    const command = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    const user = await getUser(userId);

    switch (command) {
        case '/start':
            return `Welcome, language learner! I'm here to help you practice ${user.targetLanguage}.
- Send me a message and I'll correct it.
- Use /progress to see your error history.
- Use /practice to get an exercise.
- Use /context [topic] to set a conversation topic (e.g., /context travel).`;

        case '/progress':
            const history = await getErrorHistory(userId);
            const errorEntries = Object.entries(history);

            if (errorEntries.length === 0 || errorEntries.every(entry => entry[1] === 0)) {
                return "You haven't made any recorded mistakes yet. Keep practicing!";
            }

            const progressReport = errorEntries
                .filter(entry => entry[1] > 0) // Only show errors with a count > 0
                .map(([type, count]) => `- ${type}: ${count} time(s)`)
                .join('\n');
            return `Here's your progress report:\n${progressReport}`;

        case '/practice':
            const errorHistory = await getErrorHistory(userId);
            const keys = Object.keys(errorHistory);
            const mostCommonError = keys.length > 0
                ? keys.reduce((a, b) => (errorHistory[a] || 0) > (errorHistory[b] || 0) ? a : b)
                : 'general';
            
            console.log(`Generating practice for user ${userId}, targeting error: ${mostCommonError}`);
            const exercise = await getPracticeExercise(user.targetLanguage, user.nativeLanguage, mostCommonError);

            if (!exercise) {
                return "I couldn't generate an exercise for you right now. Please try again later.";
            }

            // The AI will sometimes return the same sentence for the prompt and the answer.
            if (exercise.sentence === exercise.correct_answer) {
                return `Let's practice! Try translating this to ${user.targetLanguage}:\n\n"${exercise.sentence}"`;
            }

            return `Let's practice! (${exercise.type.replace('_', ' ')})\n\n"${exercise.sentence}"`;

        case '/context':
            if (args.length > 0) {
                const newContext = args.join(' ');
                user.context = newContext;
                await updateUserMeta(user);
                return `Context set to: "${newContext}"`;
            } else {
                return user.context ? `Current context is: "${user.context}"` : "No context is currently set. Use /context [topic] to set one.";
            }

        default:
            return `Unknown command: "${command}". Try /start to see what I can do.`;
    }
};

