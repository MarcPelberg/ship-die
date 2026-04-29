import type { CanonicalType } from "./types.js";

export const CANONICAL_TYPES: CanonicalType[] = [
  "agent harness",
  "skill/workflow pack",
  "memory/state",
  "model",
  "review/eval",
  "tool",
  "infra"
];

export function normalizeCanonicalType(value: string): CanonicalType {
  return CANONICAL_TYPES.includes(value as CanonicalType) ? (value as CanonicalType) : "tool";
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
}
