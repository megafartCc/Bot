const URL_PATTERN =
  /\b((?:https?:\/\/|www\.)[^\s<>()]+|(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+)\b/gi;
const EXPLICIT_SEXUAL_PATTERN =
  /\b(pron|porn|porno|pornhub|xvideos|xnxx|hentai|onlyfans|nudes?|nude pics?|blowjob|handjob|anal|cumshot|creampie|gay sex|lesbian sex|sex tape|explicit sex)\b/i;

function normalizeHost(hostname) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function parseCandidateUrl(raw) {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function isAllowedHost(hostname, allowedHosts) {
  return allowedHosts.some((allowedHost) => {
    return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
  });
}

export function extractUrls(text) {
  return [...String(text ?? "").matchAll(URL_PATTERN)]
    .map((match) => match[1].trim().replace(/[),.;!?]+$/g, ""))
    .filter(Boolean);
}

export function evaluateLinkPolicy(content, config) {
  const matchedUrls = extractUrls(content);

  if (matchedUrls.length === 0) {
    return null;
  }

  const blockedUrls = [];

  for (const rawUrl of matchedUrls) {
    const parsedUrl = parseCandidateUrl(rawUrl);

    if (!parsedUrl) {
      blockedUrls.push(rawUrl);
      continue;
    }

    const hostname = normalizeHost(parsedUrl.hostname);
    const isInviteLink =
      hostname === "discord.gg" ||
      (hostname === "discord.com" && parsedUrl.pathname.startsWith("/invite"));

    if (isInviteLink && config.allowInviteLinks) {
      continue;
    }

    if (isAllowedHost(hostname, config.allowedLinkHosts)) {
      continue;
    }

    blockedUrls.push(rawUrl);
  }

  if (blockedUrls.length === 0) {
    return null;
  }

  return {
    shouldDelete: true,
    source: "rule",
    category: "links",
    reason: "External links are not allowed here.",
    explanation: `Blocked link(s): ${blockedUrls.join(", ")}`,
    dmMessage: "Your message was removed because posting that link is not allowed in this server.",
    confidence: 1,
    matchedUrls: blockedUrls,
    model: null
  };
}

export function evaluateExplicitSexualContent(content, config) {
  if (!config.autoDeleteExplicitSexualContent) {
    return null;
  }

  const normalized = String(content ?? "").trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(EXPLICIT_SEXUAL_PATTERN);

  if (!match) {
    return null;
  }

  return {
    shouldDelete: true,
    source: "rule",
    category: "sexual_content",
    reason: "Explicit sexual content is not allowed here.",
    explanation: `Matched explicit sexual content term: ${match[0]}`,
    dmMessage: "Your message was removed because explicit sexual content is not allowed in this server.",
    confidence: 1,
    matchedUrls: [],
    model: null
  };
}
