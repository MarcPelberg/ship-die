import { domainFromUrl } from "../domain/urls.js";
import type { CardDraft } from "../domain/types.js";
import { normalizeTags } from "../domain/taxonomy.js";
import type { CardGenerationInput, LlmProvider } from "./provider.js";

function classifyType(text: string): CardDraft["canonicalType"] {
  const t = text.toLowerCase();
  if (/\b(gpt|claude|deepseek|model|llm)\b/.test(t)) return "model";
  if (/\b(eval|benchmark|review|test)\b/.test(t)) return "review/eval";
  if (/\b(memory|state|context)\b/.test(t)) return "memory/state";
  if (/\b(workflow|skill|playbook)\b/.test(t)) return "skill/workflow pack";
  if (/\b(agent|harness)\b/.test(t)) return "agent harness";
  if (/\b(infra|deploy|docker|kubernetes|k8s|cloud)\b/.test(t)) return "infra";
  return "tool";
}

function shortSummary(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 180) return compact;
  return `${compact.slice(0, 177).trimEnd()}...`;
}

export class LocalFallbackProvider implements LlmProvider {
  async generateCard(input: CardGenerationInput): Promise<CardDraft> {
    const text = input.cleanedText.trim();
    const firstLink = input.links[0];
    const sourceUrl = firstLink?.canonicalUrl;
    const domain = domainFromUrl(sourceUrl);

    const titleFromMetadata = firstLink?.title?.trim();
    const title = titleFromMetadata
      ? titleFromMetadata
      : domain
        ? `${domain} resource`
        : text.split(/\s+/).slice(0, 8).join(" ").slice(0, 70) || "Shared resource";

    const tags = normalizeTags([
      ...(domain ? [domain] : []),
      ...text.toLowerCase().split(/[^a-z0-9+/.-]+/).filter((part) => part.length >= 4).slice(0, 6)
    ]);

    return {
      title,
      summary: shortSummary(text),
      canonicalType: classifyType(text),
      tags,
      sourceUrl,
      sourceNote: "auto-curated locally (no external model key configured)",
      confidence: sourceUrl ? 0.75 : 0.68,
      shouldPublish: text.length >= 12
    };
  }
}

