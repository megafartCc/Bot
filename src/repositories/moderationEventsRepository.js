export async function insertModerationEvent(pool, event) {
  await pool.execute(
    `
      INSERT INTO moderation_events (
        guild_id,
        channel_id,
        message_id,
        user_id,
        username,
        source,
        category,
        reason,
        explanation,
        confidence,
        raw_content,
        matched_urls,
        model,
        delete_status,
        delete_error,
        dm_status,
        dm_error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      event.guildId,
      event.channelId,
      event.messageId,
      event.userId,
      event.username,
      event.source,
      event.category,
      event.reason,
      event.explanation,
      event.confidence,
      event.rawContent,
      event.matchedUrls,
      event.model,
      event.deleteStatus,
      event.deleteError,
      event.dmStatus,
      event.dmError
    ]
  );
}
