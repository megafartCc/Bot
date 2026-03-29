function isRoughKeyMatch(content) {
  return /\b(key|get key|where key|what(?:'s| is) the key|how (?:do i|to) get (?:the )?key)\b/i.test(
    content
  );
}

function buildKeyReplyText(replyTarget) {
  const normalized = String(replyTarget ?? "").trim();

  if (!normalized) {
    return "Get key at <#1481396985662537942>.";
  }

  if (/^get key at\b/i.test(normalized)) {
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  }

  return `Get key at ${normalized}${/[.!?]$/.test(normalized) ? "" : "."}`;
}

export class AutoResponderService {
  constructor({ config, logger, responder }) {
    this.config = config;
    this.logger = logger;
    this.responder = responder;
    this.cooldowns = new Map();
  }

  async handleMessage(message) {
    if (!this.config.autoResponderEnabled) {
      return false;
    }

    if (!message?.inGuild() || message.author?.bot || !message.content?.trim()) {
      return false;
    }

    if (this.config.exemptUserIds.includes(message.author.id)) {
      return false;
    }

    if (this.config.exemptChannelIds.includes(message.channelId)) {
      return false;
    }

    const member = message.member;

    if (member) {
      const hasExemptRole = member.roles.cache.some((role) =>
        this.config.exemptRoleIds.includes(role.id)
      );

      if (hasExemptRole) {
        return false;
      }
    }

    if (!isRoughKeyMatch(message.content)) {
      return false;
    }

    if (this.hasCooldown() && this.isCoolingDown(message)) {
      return false;
    }

    const replyText = buildKeyReplyText(this.config.autoResponderReplyKey);
    const decision = await this.responder.classifyMessage(message, replyText);

    if (!decision.shouldReply) {
      return false;
    }

    try {
      await message.reply({
        content: decision.reply || replyText,
        allowedMentions: {
          repliedUser: false
        }
      });
      if (this.hasCooldown()) {
        this.markCooldown(message);
      }
      return true;
    } catch (error) {
      this.logger.warn(
        {
          messageId: message.id,
          error: error.message
        },
        "Failed to send auto-response"
      );
      return false;
    }
  }

  getCooldownKey(message) {
    return `${message.guildId}:${message.channelId}:${message.author.id}`;
  }

  hasCooldown() {
    return this.config.autoResponderCooldownSeconds > 0;
  }

  isCoolingDown(message) {
    const key = this.getCooldownKey(message);
    const expiresAt = this.cooldowns.get(key) || 0;
    if (expiresAt <= Date.now()) {
      this.cooldowns.delete(key);
    }
    return expiresAt > Date.now();
  }

  markCooldown(message) {
    const key = this.getCooldownKey(message);
    const expiresAt = Date.now() + this.config.autoResponderCooldownSeconds * 1000;
    this.cooldowns.set(key, expiresAt);
  }
}
