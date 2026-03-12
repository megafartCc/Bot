import http from "node:http";
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials
} from "discord.js";
import { config } from "./config.js";
import { createDatabasePool, initializeDatabase } from "./db/mysql.js";
import { logger } from "./logger.js";
import { GroqModerator } from "./moderation/groqModerator.js";
import { GroqResponder } from "./responders/groqResponder.js";
import { AutoResponderService } from "./services/autoResponderService.js";
import { ModerationService } from "./services/moderationService.js";

let isReady = false;
let healthServer = null;

function startHealthServer() {
  const server = http.createServer((request, response) => {
    const payload = JSON.stringify({
      ok: true,
      ready: isReady,
      uptimeSeconds: Math.floor(process.uptime())
    });

    if (request.url === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(payload);
      return;
    }

    response.writeHead(200, { "content-type": "text/plain" });
    response.end("DiscordBot is running.");
  });

  server.listen(config.port, () => {
    logger.info({ port: config.port }, "Health server listening");
  });

  return server;
}

async function hydrateMessage(message) {
  if (!message.partial) {
    return message;
  }

  try {
    return await message.fetch();
  } catch {
    return null;
  }
}

async function main() {
  const pool = createDatabasePool(config);
  await initializeDatabase(pool);
  logger.info("MySQL connection ready");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  const moderator = new GroqModerator(config, logger);
  const responder = new GroqResponder(config, logger);
  const moderationService = new ModerationService({
    client,
    config,
    logger,
    pool,
    moderator
  });
  const autoResponderService = new AutoResponderService({
    config,
    logger,
    responder
  });

  client.once(Events.ClientReady, (readyClient) => {
    isReady = true;
    logger.info({ user: readyClient.user.tag }, "Discord bot is ready");
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      const moderated = await moderationService.handleMessage(message, {
        sourceEvent: "messageCreate"
      });

      if (!moderated) {
        await autoResponderService.handleMessage(message);
      }
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, "Message processing failed");
    }
  });

  client.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
    if (!config.moderateMessageEdits) {
      return;
    }

    try {
      if (
        !_oldMessage.partial &&
        !newMessage.partial &&
        _oldMessage.content === newMessage.content
      ) {
        return;
      }

      const hydrated = await hydrateMessage(newMessage);

      if (!hydrated) {
        return;
      }

      await moderationService.handleMessage(hydrated, { sourceEvent: "messageUpdate" });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, "Edited message moderation failed");
    }
  });

  client.on(Events.Error, (error) => {
    logger.error({ error: error.message, stack: error.stack }, "Discord client error");
  });

  healthServer = startHealthServer();
  await client.login(config.discordToken);

  const shutdown = async (signal) => {
    logger.info({ signal }, "Shutting down");
    isReady = false;
    healthServer?.close();
    client.destroy();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      logger.error({ error: error.message }, "SIGINT shutdown failed");
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      logger.error({ error: error.message }, "SIGTERM shutdown failed");
      process.exit(1);
    });
  });
}

main().catch((error) => {
  logger.error({ error: error.message, stack: error.stack }, "Fatal startup error");
  process.exit(1);
});
