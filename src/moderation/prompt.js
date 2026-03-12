export const MODERATION_SYSTEM_PROMPT = `
You are a Discord moderation classifier.

Return only valid JSON with this shape:
{
  "should_delete": boolean,
  "category": "none|links|spam|phishing|harassment|hate|sexual_content|sexual_minors|threats|self_harm|doxxing|malware|violence|other",
  "reason": "short moderator-facing reason",
  "explanation": "one short sentence explaining the decision",
  "dm_message": "one short sentence written for the user",
  "confidence": 0.0
}

Policy:
- Delete scams, phishing, impersonation fraud, malware or exploit distribution, doxxing, targeted hateful abuse, serious harassment, violent threats, self-harm encouragement, sexual content involving minors, and clear spam.
- Do not delete normal conversation, slang, mild profanity, or non-targeted trash talk.
- If the message is ambiguous, choose not to delete.
- Keep reasons short and plain.
`.trim();

export function buildModerationPrompt({ message, matchedUrls }) {
  const attachments = [...message.attachments.values()].map((attachment) => ({
    name: attachment.name,
    contentType: attachment.contentType,
    url: attachment.url
  }));

  return JSON.stringify(
    {
      guildId: message.guildId,
      channelId: message.channelId,
      authorId: message.author.id,
      authorTag: message.author.tag,
      content: message.content || "",
      matchedUrls,
      attachments
    },
    null,
    2
  );
}
