import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { setupRoutes } from './router';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf(token);

// Setup all the routes
setupRoutes(bot);

export default bot;
