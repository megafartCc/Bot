import Groq from "groq-sdk";
import { z } from "zod";
import {
  AUTO_RESPONDER_SYSTEM_PROMPT,
  buildAutoResponderPrompt
} from "./prompt.js";

const autoResponderResultSchema = z.object({
  should_reply: z.boolean(),
  reply: z.string(),
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

export class GroqResponder {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.client = new Groq({
      apiKey: config.groqApiKey,
      timeout: config.groqTimeoutMs,
      maxRetries: 2
    });
  }

  async classifyMessage(message, replyText) {
    const completion = await this.client.chat.completions.create({
      model: this.config.groqModel,
      temperature: 0,
      max_completion_tokens: 120,
      messages: [
        {
          role: "system",
          content: AUTO_RESPONDER_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: buildAutoResponderPrompt({ message, replyText })
        }
      ]
    });

    const rawContent = completion.choices?.[0]?.message?.content?.trim() || "{}";

    try {
      const parsed = autoResponderResultSchema.parse(JSON.parse(extractJsonObject(rawContent)));

      return {
        shouldReply: parsed.should_reply,
        reply: parsed.reply,
        confidence: parsed.confidence
      };
    } catch (error) {
      this.logger.warn(
        {
          error: error.message,
          rawContent
        },
        "Failed to parse Groq auto-responder response"
      );

      return {
        shouldReply: false,
        reply: "",
        confidence: 0
      };
    }
  }
}
