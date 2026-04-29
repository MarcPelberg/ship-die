const ADMIN_PATTERNS = [
  /changed the group description/i,
  /deleted this message/i,
  /you added/i,
  /joined using this group's invite link/i,
  /click to view/i
];

const ACKS = new Set(["thanks", "thank you", "👍", "+1", "ok", "got it"]);

export function isNoiseMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  if (ACKS.has(normalized)) return true;
  if (ADMIN_PATTERNS.some((pattern) => pattern.test(text))) return true;
  return normalized.length < 12 && !normalized.includes("http");
}
