import { ChannelType } from "discord.js";
import { insertModerationEvent } from "../repositories/moderationEventsRepository.js";
import { evaluateLinkPolicy, extractUrls } from "../moderation/linkRules.js";
import { hasTextContent, truncateText } from "../utils/text.js";

export class ModerationService {
  constructor({ client, config, logger, pool, moderator }) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.pool = pool;
    this.moderator = moderator;
  }

  async handleMessage(message, { sourceEvent = "messageCreate" } = {}) {
    if (!(await this.shouldInspectMessage(message))) {
      return false;
    }

    const matchedUrls = extractUrls(message.content);
    let decision = null;

    if (this.config.autoDeleteLinks) {
      decision = evaluateLinkPolicy(message.content, this.config);
    }

    if (!decision && this.config.aiModerationEnabled && this.shouldUseAi(message)) {
      decision = await this.moderator.classifyMessage(message, matchedUrls);
    }

    if (!decision?.shouldDelete) {
      return false;
    }

    await this.applyDecision(message, decision, sourceEvent);
    return true;
  }

  async shouldInspectMessage(message) {
    if (!message || !message.inGuild()) {
      return false;
    }

    if (message.author?.bot || message.system || message.webhookId) {
      return false;
    }

    if (this.config.exemptUserIds.includes(message.author.id)) {
      return false;
    }

    if (this.config.exemptChannelIds.includes(message.channelId)) {
      return false;
    }

    const member = message.member ?? (await this.tryFetchMember(message));

    if (member) {
      const hasExemptRole = member.roles.cache.some((role) =>
        this.config.exemptRoleIds.includes(role.id)
      );

      if (hasExemptRole) {
        return false;
      }
    }

    if (!hasTextContent(message) && this.config.allowAttachmentOnlyMessages) {
      return false;
    }

    return true;
  }

  shouldUseAi(message) {
    return (message.content || "").trim().length >= this.config.aiModerationMinLength;
  }

  async tryFetchMember(message) {
    try {
      return await message.guild.members.fetch(message.author.id);
    } catch {
      return null;
    }
  }

  async applyDecision(message, decision, sourceEvent) {
    let deleteStatus = "pending";
    let deleteError = null;
    let dmStatus = "skipped";
    let dmError = null;

    try {
      await message.delete();
      deleteStatus = "deleted";
    } catch (error) {
      deleteStatus = "failed";
      deleteError = error.message;
      this.logger.warn(
        {
          messageId: message.id,
          error: error.message
        },
        "Failed to delete message"
      );
    }

    if (deleteStatus === "deleted") {
      try {
        await message.author.send(this.buildDmText(message, decision));
        dmStatus = "sent";
      } catch (error) {
        dmStatus = "failed";
        dmError = error.message;
      }
    }

    await insertModerationEvent(this.pool, {
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
      userId: message.author.id,
      username: message.author.tag,
      source: decision.source,
      category: decision.category,
      reason: decision.reason,
      explanation: `${decision.explanation} (${sourceEvent})`,
      confidence: decision.confidence,
      rawContent: truncateText(message.content || "", this.config.maxStoredMessageChars),
      matchedUrls: decision.matchedUrls?.join(", ") || null,
      model: decision.model,
      deleteStatus,
      deleteError,
      dmStatus,
      dmError
    });

    await this.sendModLog(message, decision, deleteStatus, dmStatus);

    this.logger.info(
      {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        userId: message.author.id,
        category: decision.category,
        source: decision.source
      },
      "Moderation action recorded"
    );
  }

  buildDmText(message, decision) {
    const excerpt = truncateText(message.content || "[no text content]", 240);

    return [
      `Your message in "${message.guild.name}" was removed.`,
      `Reason: ${decision.reason}`,
      `Details: ${decision.dmMessage || decision.explanation}`,
      `Excerpt: ${excerpt}`,
      "If you think this was a mistake, contact the server moderators."
    ].join("\n");
  }

  async sendModLog(message, decision, deleteStatus, dmStatus) {
    if (!this.config.modLogChannelId) {
      return;
    }

    try {
      const channel = await this.client.channels.fetch(this.config.modLogChannelId);

      if (!channel || channel.type !== ChannelType.GuildText) {
        return;
      }

      await channel.send({
        content: [
          `Message deleted in <#${message.channelId}>`,
          `User: <@${message.author.id}>`,
          `Category: ${decision.category}`,
          `Reason: ${decision.reason}`,
          `Source: ${decision.source}`,
          `Delete: ${deleteStatus}`,
          `DM: ${dmStatus}`
        ].join("\n")
      });
    } catch (error) {
      this.logger.warn(
        {
          channelId: this.config.modLogChannelId,
          error: error.message
        },
        "Failed to send moderation log message"
      );
    }
  }
}
