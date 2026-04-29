import type { CardDraft } from "./types.js";
import { stripPII } from "./pii.js";
import { canonicalizeUrl } from "./urls.js";

const LIKELY_PERSON_NAME_RE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;

export function sanitizePublicCardDraft(card: CardDraft): CardDraft {
  return {
    ...card,
    title: sanitizePublicText(card.title),
    summary: sanitizePublicText(card.summary),
    tags: card.tags.map(sanitizePublicText),
    sourceUrl: sanitizePublicUrl(card.sourceUrl),
    sourceNote: sanitizePublicText(card.sourceNote)
  };
}

export function sanitizePublicText(text: string): string {
  return stripPII(text).replace(LIKELY_PERSON_NAME_RE, "[name]");
}

function sanitizePublicUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const url = new URL(canonicalizeUrl(rawUrl));
  url.search = "";
  url.hash = "";
  return url.toString();
}
