import OpenAI from "openai";
import { z } from "zod";

import { stripPII } from "../domain/pii.js";
import { normalizeCanonicalType, normalizeTags } from "../domain/taxonomy.js";
import type { CardDraft } from "../domain/types.js";
import { CARD_SYSTEM_PROMPT } from "./prompts.js";
import type { CardGenerationInput, LlmProvider } from "./provider.js";

const DraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  canonicalType: z.string(),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().optional().default(""),
  sourceNote: z.string().min(1),
  confidence: z.coerce.number().min(0).max(1),
  shouldPublish: z.boolean(),
  rejectionReason: z.string().optional()
});

export function parseDeepSeekCardDraft(content: string): CardDraft {
  const draft = DraftSchema.parse(JSON.parse(content));
  const sourceUrl = draft.sourceUrl.trim();

  return {
    title: stripPII(draft.title),
    summary: stripPII(draft.summary),
    canonicalType: normalizeCanonicalType(draft.canonicalType),
    tags: normalizeTags(draft.tags),
    sourceUrl: sourceUrl === "" ? undefined : sourceUrl,
    sourceNote: stripPII(draft.sourceNote),
    confidence: draft.confidence,
    shouldPublish: draft.shouldPublish,
    rejectionReason: draft.rejectionReason === undefined ? undefined : stripPII(draft.rejectionReason)
  };
}

export type DeepSeekConfig = {
  apiKey: string;
  model: string;
};

export class DeepSeekProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: DeepSeekConfig) {
    if (!config.apiKey) {
      throw new Error("DeepSeek apiKey is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.deepseek.com"
    });
    this.model = config.model;
  }

  async generateCard(input: CardGenerationInput): Promise<CardDraft> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: CARD_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) }
      ],
      response_format: { type: "json_object" },
      stream: false
    });
    const content = response.choices[0]?.message.content;

    if (!content) {
      throw new Error("DeepSeek returned an empty card response");
    }

    return parseDeepSeekCardDraft(content);
  }
}
