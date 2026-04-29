import type { CardDraft } from "./types.js";
import { stripPII } from "./pii.js";

const LIKELY_PERSON_NAME_RE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;

export function sanitizePublicCardDraft(card: CardDraft): CardDraft {
  return {
    ...card,
    title: sanitizePublicText(card.title),
    summary: sanitizePublicText(card.summary),
    tags: card.tags.map(sanitizePublicText),
    sourceNote: sanitizePublicText(card.sourceNote)
  };
}

export function sanitizePublicText(text: string): string {
  return stripPII(text).replace(LIKELY_PERSON_NAME_RE, "[name]");
}
