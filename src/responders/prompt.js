export const AUTO_RESPONDER_SYSTEM_PROMPT = `
You are a Discord auto-responder classifier.

Return only valid JSON with this shape:
{
  "should_reply": boolean,
  "reply": "string",
  "confidence": 0.0
}

Rules:
- Only reply if the user is asking about the key, where to get the key, what the key is, or how to obtain the key.
- If the message is not clearly about the key, do not reply.
- If you reply, use the exact reply text provided in the input.
- If unsure, do not reply.
`.trim();

export function buildAutoResponderPrompt({ message, replyText }) {
  return JSON.stringify(
    {
      replyText,
      content: message.content || "",
      authorId: message.author.id,
      channelId: message.channelId,
      guildId: message.guildId
    },
    null,
    2
  );
}
