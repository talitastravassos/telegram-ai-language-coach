import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { setupRoutes } from './router';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf(token);

setupRoutes(bot);

export default bot;
