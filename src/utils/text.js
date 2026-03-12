export function truncateText(text, maxLength) {
  const normalized = String(text ?? "").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function hasTextContent(message) {
  return Boolean(message.content && message.content.trim().length > 0);
}
