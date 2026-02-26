import dotenv from 'dotenv';
import OpenAI from 'openai';

import { correctionPrompt } from './prompts/correction';
import { practicePrompt } from './prompts/practice';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the expected response structure
export interface CorrectionResponse {
  corrected: string;
  explanation: string;
  errorType:
    | 'tense'
    | 'preposition'
    | 'grammar'
    | 'word_choice'
    | 'syntax'
    | null;
}

export interface PracticeExercise {
  type: string;
  sentence: string;
  correct_answer: string;
}

const model = 'gpt-4o-mini'; // Or another suitable model

export const getCorrection = async (
  message: string,
  targetLanguage: string,
  nativeLanguage: string,
): Promise<CorrectionResponse | null> => {
  const filledPrompt = correctionPrompt
    .replace('{message}', message)
    .replace('{targetLanguage}', targetLanguage)
    .replace('{nativeLanguage}', nativeLanguage);

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'system', content: filledPrompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }, // Use JSON mode
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      console.error('OpenAI response content is null or empty.');
      return null;
    }

    const parsedResponse: CorrectionResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error) {
    console.error('Error fetching correction from OpenAI:', error);
    return null;
  }
};

export const getPracticeExercise = async (
  targetLanguage: string,
  nativeLanguage: string,
  errorType: string = 'general',
): Promise<PracticeExercise | null> => {
  const filledPrompt = practicePrompt
    .replace('{targetLanguage}', targetLanguage)
    .replace('{nativeLanguage}', nativeLanguage)
    .replace('{errorType}', errorType);

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'system', content: filledPrompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      console.error(
        'OpenAI response content is null or empty for practice exercise.',
      );
      return null;
    }

    const parsedResponse: PracticeExercise = JSON.parse(content);
    return parsedResponse;
  } catch (error) {
    console.error('Error fetching practice exercise from OpenAI:', error);
    return null;
  }
};
