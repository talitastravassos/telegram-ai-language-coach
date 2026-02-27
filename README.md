# Telegram AI Language Immersion Coach

A Telegram bot that acts as your personal language tutor, correcting your messages in real-time and generating personalized exercises based on your most frequent mistakes.

## 🚀 Features

- **Choose Your Language:** Set any target language you want to learn (e.g., Spanish, French, Japanese).
- **Natural Conversation:** Chat naturally with the bot without needing commands! It responds in your target language to keep the conversation flowing, while still correcting your mistakes.
- **Message Correction:** Corrects grammar, word choice, prepositions, and tenses.
- **Explanations in Native Language:** Corrections come with a simple explanation exclusively in **Brazilian Portuguese**. This is a core feature and cannot be customized.
- **Error Tracking:** The bot monitors recurring mistakes and triggers reinforcement alerts after 3 errors of the same type.
- **Personalized Exercises:** Generate practice exercises (`/practice`) based on your personal error history. Exercises are focused on translations between the target language and Brazilian Portuguese.
- **Conversation Context:** Set a specific topic (`/context`) to guide your practice and make learning more relevant.

## 🛠️ Tech Stack

- **Node.js & TypeScript**
- **Express:** Server for handling incoming webhooks.
- **Telegraf:** Framework for the Telegram Bot API.
- **Redis:** Persistence for user metadata and error history.
- **OpenAI API:** Powered by GPT-4o-mini for high-quality language processing.

## 📋 Prerequisites

- Node.js (v18+)
- A Telegram Bot Token (obtained from [@BotFather](https://t.me/BotFather))
- An OpenAI API Key
- [ngrok](https://ngrok.com/) (for local development)
- Redis (running locally or via Docker)

## 🏗️ Setup and Execution

### 1. Clone the Repository and Install Dependencies

```bash
git clone https://github.com/your-username/telegram-language-coach.git
cd telegram-language-coach
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
BOT_TOKEN=your_telegram_bot_token
WEBHOOK_DOMAIN=https://your-ngrok-domain.ngrok-free.app
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_api_key
```

### 3. Run Redis (via Docker)

If you have Docker installed, you can start Redis with this command:

```bash
docker run -d -p 6379:6379 redis
```

### 4. Setup ngrok Tunnel (Local Development)

Since the bot uses webhooks to receive Telegram messages, you need a stable public URL while developing locally.

1.  Open a new terminal and run:
    ```bash
    ngrok http 3000
    ```
2.  Copy the generated `https` URL (e.g., `https://abcd-123-456.ngrok-free.app`).
3.  Paste this URL into your `.env` file in the `WEBHOOK_DOMAIN` field.
4.  **Keep the ngrok terminal open** while testing the bot.

### 5. Start the Server

```bash
npm run dev
```

## 🤖 How to Use the Bot

1.  In Telegram, find your bot and send `/start` to begin.
2.  **Set Your Language:** Use the `/language [language]` command to set your target language (e.g., `/language Spanish`).
3.  **Start Chatting:** Send any message in your target language. The bot will respond naturally and provide corrections/explanations only if you make a mistake.
4.  **No Commands Needed:** You can practice without using `/start` or `/practice` every time. Just talk!
5.  Useful Commands:
    - `/language [language]`: Sets or changes your target language.
    - `/practice`: Generates a personalized exercise based on your past mistakes.
    - `/progress`: View your most common errors classified by type.
    - `/context [topic]`: Sets a conversation topic (e.g., `/context business`, `/context travel`).

## 🗂️ Project Structure

- `src/app/`: Bot configuration, routes, and Express server.
- `src/core/`: Core correction logic (pipeline) and message/command handlers.
- `src/ai/`: OpenAI API client integration.
- `src/users/`: User metadata management and Redis persistence.
- `src/infra/`: Redis database connection.
