import Groq from "groq-sdk";
import { z } from "zod";
import { buildModerationPrompt, MODERATION_SYSTEM_PROMPT } from "./prompt.js";

const moderationResultSchema = z.object({
  should_delete: z.boolean(),
  category: z.string(),
  reason: z.string(),
  explanation: z.string(),
  dm_message: z.string(),
  confidence: z.coerce.number().min(0).max(1)
});

function extractJsonObject(rawText) {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }

  return trimmed.slice(start, end + 1);
}

export class GroqModerator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.client = new Groq({
      apiKey: config.groqApiKey,
      timeout: config.groqTimeoutMs,
      maxRetries: 2
    });
  }

  async classifyMessage(message, matchedUrls = []) {
    const completion = await this.client.chat.completions.create({
      model: this.config.groqModel,
      temperature: this.config.groqTemperature,
      max_completion_tokens: this.config.groqMaxOutputTokens,
      messages: [
        {
          role: "system",
          content: MODERATION_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: buildModerationPrompt({ message, matchedUrls })
        }
      ]
    });

    const rawContent = completion.choices?.[0]?.message?.content?.trim() || "{}";

    try {
      const parsed = moderationResultSchema.parse(JSON.parse(extractJsonObject(rawContent)));

      return {
        shouldDelete: parsed.should_delete,
        source: "ai",
        category: parsed.category,
        reason: parsed.reason,
        explanation: parsed.explanation,
        dmMessage: parsed.dm_message,
        confidence: parsed.confidence,
        matchedUrls,
        model: completion.model || this.config.groqModel
      };
    } catch (error) {
      this.logger.warn(
        {
          error: error.message,
          rawContent
        },
        "Failed to parse Groq moderation response"
      );

      return {
        shouldDelete: false,
        source: "ai",
        category: "none",
        reason: "No action",
        explanation: "The moderation model returned an invalid response.",
        dmMessage: "",
        confidence: 0,
        matchedUrls,
        model: completion.model || this.config.groqModel
      };
    }
  }
}
