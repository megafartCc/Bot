# DiscordBot

Railway-ready Discord moderation bot in JavaScript. It watches server messages, deletes messages that hit your link policy or your Groq moderation rules, DMs the user with the reason, and logs moderation actions to MySQL.

## What it does

- Deletes non-allowed links before spending AI tokens.
- Uses Groq to classify risky messages against a safety policy modeled around Discord ToS-style violations.
- Uses Groq to detect key-related questions and auto-reply with your configured key answer.
- DMs the author after deletion with a short reason.
- Stores moderation events in MySQL.
- Optionally posts a plain-text moderation log to a Discord channel.
- Exposes a cheap `/healthz` HTTP endpoint for Railway.

## Stack

- `discord.js`
- `groq-sdk`
- `mysql2`
- `pino`
- `zod`

## Setup

1. Create a Discord application and bot in the Discord Developer Portal.
2. Enable `Message Content Intent` for the bot.
3. Invite the bot with permissions that include:
   - `View Channels`
   - `Read Message History`
   - `Manage Messages`
   - `Send Messages`
4. Fill out `.env` or copy from `.env.example`.
5. Install dependencies with `npm install`.
6. Start locally with `npm run dev`.

## Railway

1. Create a new Railway project from this folder.
2. Add a MySQL service or point the env vars at an external MySQL database.
3. Set your Railway variables from `.env.example`.
4. Use `npm start` as the start command if Railway does not auto-detect it.

## Important env vars

- `DISCORD_TOKEN`: bot token from Discord.
- `GROQ_API_KEY`: Groq API key.
- `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`: MySQL connection values. The bot also accepts the underscore versions if you already use those.
- `GROQ_MODEL`: default is `llama-3.1-8b-instant` because it is fast and cheap.
- `MOD_LOG_CHANNEL_ID`: optional channel where the bot posts moderation logs.
- `ALLOWED_LINK_HOSTS`: comma-separated allowlist like `youtube.com,youtu.be,github.com`.
- `EXEMPT_CHANNEL_IDS`, `EXEMPT_ROLE_IDS`, `EXEMPT_USER_IDS`: comma-separated bypass lists.
- `AUTO_RESPONDER_REPLY_KEY`: the value inserted into the auto-response, default `UnknownHub`.

## Database

The bot creates its `moderation_events` table automatically on startup. If you want to create it yourself, use `sql/schema.sql`.

## Notes

- This starter keeps the prompt strict on scams, phishing, malware, threats, hateful abuse, sexual content involving minors, doxxing, and self-harm encouragement.
- It is intentionally more careful on normal profanity or mild arguments to avoid false positives.
- If you want server-specific rules later, add them to the prompt in `src/moderation/prompt.js`.
