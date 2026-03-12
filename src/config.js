import "dotenv/config";
import { z } from "zod";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeHost(host) {
  return host.replace(/^www\./i, "").toLowerCase();
}

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().optional(),
  MOD_LOG_CHANNEL_ID: z.string().optional(),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  GROQ_TIMEOUT_MS: z.string().optional(),
  GROQ_TEMPERATURE: z.string().optional(),
  GROQ_MAX_OUTPUT_TOKENS: z.string().optional(),
  MYSQL_HOST: z.string().min(1, "MYSQL_HOST is required"),
  MYSQL_PORT: z.string().optional(),
  MYSQL_USER: z.string().min(1, "MYSQL_USER is required"),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().min(1, "MYSQL_DATABASE is required"),
  MYSQL_CONNECTION_LIMIT: z.string().optional(),
  AUTO_DELETE_LINKS: z.string().optional(),
  ALLOW_INVITE_LINKS: z.string().optional(),
  ALLOW_ATTACHMENT_ONLY_MESSAGES: z.string().optional(),
  AI_MODERATION_ENABLED: z.string().optional(),
  AI_MODERATION_MIN_LENGTH: z.string().optional(),
  MAX_STORED_MESSAGE_CHARS: z.string().optional(),
  MODERATE_MESSAGE_EDITS: z.string().optional(),
  AUTO_RESPONDER_ENABLED: z.string().optional(),
  AUTO_RESPONDER_COOLDOWN_SECONDS: z.string().optional(),
  AUTO_RESPONDER_REPLY_KEY: z.string().optional(),
  ALLOWED_LINK_HOSTS: z.string().optional(),
  EXEMPT_CHANNEL_IDS: z.string().optional(),
  EXEMPT_ROLE_IDS: z.string().optional(),
  EXEMPT_USER_IDS: z.string().optional()
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseNumber(env.PORT, 3000),
  logLevel: env.LOG_LEVEL,
  discordToken: env.DISCORD_TOKEN,
  discordClientId: env.DISCORD_CLIENT_ID || null,
  modLogChannelId: env.MOD_LOG_CHANNEL_ID || null,
  groqApiKey: env.GROQ_API_KEY,
  groqModel: env.GROQ_MODEL,
  groqTimeoutMs: parseNumber(env.GROQ_TIMEOUT_MS, 10_000),
  groqTemperature: parseNumber(env.GROQ_TEMPERATURE, 0),
  groqMaxOutputTokens: parseNumber(env.GROQ_MAX_OUTPUT_TOKENS, 180),
  mysql: {
    host: env.MYSQL_HOST,
    port: parseNumber(env.MYSQL_PORT, 3306),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD || "",
    database: env.MYSQL_DATABASE,
    connectionLimit: parseNumber(env.MYSQL_CONNECTION_LIMIT, 5)
  },
  autoDeleteLinks: parseBoolean(env.AUTO_DELETE_LINKS, true),
  allowInviteLinks: parseBoolean(env.ALLOW_INVITE_LINKS, false),
  allowAttachmentOnlyMessages: parseBoolean(env.ALLOW_ATTACHMENT_ONLY_MESSAGES, true),
  aiModerationEnabled: parseBoolean(env.AI_MODERATION_ENABLED, true),
  aiModerationMinLength: parseNumber(env.AI_MODERATION_MIN_LENGTH, 3),
  maxStoredMessageChars: parseNumber(env.MAX_STORED_MESSAGE_CHARS, 1000),
  moderateMessageEdits: parseBoolean(env.MODERATE_MESSAGE_EDITS, true),
  autoResponderEnabled: parseBoolean(env.AUTO_RESPONDER_ENABLED, true),
  autoResponderCooldownSeconds: parseNumber(env.AUTO_RESPONDER_COOLDOWN_SECONDS, 30),
  autoResponderReplyKey: env.AUTO_RESPONDER_REPLY_KEY || "UnknownHub",
  allowedLinkHosts: parseCsv(env.ALLOWED_LINK_HOSTS).map(normalizeHost),
  exemptChannelIds: parseCsv(env.EXEMPT_CHANNEL_IDS),
  exemptRoleIds: parseCsv(env.EXEMPT_ROLE_IDS),
  exemptUserIds: parseCsv(env.EXEMPT_USER_IDS)
};
