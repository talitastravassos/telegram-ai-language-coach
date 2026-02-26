// src/app/router.ts
import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { handleTextMessage, handleCommand } from '../core/message-handler';

const setupCommands = (bot: Telegraf) => {
    const commandHandler = async (ctx: Context) => {
        if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
        const reply = await handleCommand(ctx.from.id, ctx.message.text);
        await ctx.reply(reply);
    };

    bot.start(commandHandler);
    bot.command('practice', commandHandler);
    bot.command('progress', commandHandler);
    bot.command('context', commandHandler);
};

export const setupRoutes = (bot: Telegraf) => {
    setupCommands(bot);

    bot.on(message('text'), async (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text;

        if (text.startsWith('/')) {
            // Check if it's one of the known commands. If not, Telegraf won't handle it
            // and we can provide a generic "unknown command" message.
            const command = text.split(' ')[0] || '';
            if (!['/start', '/practice', '/progress', '/context'].includes(command)) {
                const reply = await handleCommand(userId, text);
                await ctx.reply(reply);
            }
            // If it is a known command, the command handler will take care of it.
            return;
        }
        
        const reply = await handleTextMessage(userId, text);
        await ctx.reply(reply);
    });
};
