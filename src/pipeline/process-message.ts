import type { CardDraft, LinkMetadata, RawMessageInput } from "../domain/types.js";
import { sanitizePublicCardDraft } from "../domain/public-card.js";
import { stripPII } from "../domain/pii.js";
import { isNoiseMessage } from "../domain/noise.js";
import { canonicalizeUrl, extractUrls } from "../domain/urls.js";
import type { LlmProvider } from "../llm/provider.js";

export type PipelineEvent = {
  externalId: string;
  level: "info" | "warn" | "error";
  eventType: string;
  message: string;
  metadata?: unknown;
};

export interface PipelineRepo {
  publishCard(card: CardDraft, message: RawMessageInput): Promise<void>;
  markProcessed(externalId: string): Promise<void>;
  logEvent(event: PipelineEvent): Promise<void>;
}

export type ProcessMessageInput = {
  message: RawMessageInput;
  provider: LlmProvider;
  repo: PipelineRepo;
  fetchMetadata: (url: string) => Promise<LinkMetadata>;
};

export type ProcessResult =
  | { status: "published" }
  | { status: "rejected"; reason: string };

const MIN_CONFIDENCE = 0.68;

export async function processMessage(input: ProcessMessageInput): Promise<ProcessResult> {
  const { message, provider, repo, fetchMetadata } = input;

  if (isNoiseMessage(message.text)) {
    await repo.logEvent({
      externalId: message.externalId,
      level: "info",
      eventType: "noise_rejected",
      message: "Rejected noise message",
      metadata: {}
    });
    await repo.markProcessed(message.externalId);
    return { status: "rejected", reason: "noise" };
  }

  const links = await Promise.all(
    extractUrls(message.text).map(async (rawUrl) => {
      const url = canonicalizeUrl(rawUrl);
      try {
        return await fetchMetadata(url);
      } catch {
        return { url, canonicalUrl: url };
      }
    })
  );

  const cleanedText = stripPII(message.text);
  const draft = await provider.generateCard({ message, cleanedText, links });

  if (!draft.shouldPublish || draft.confidence < MIN_CONFIDENCE) {
    const reason = draft.rejectionReason ?? "low_confidence";
    await repo.logEvent({
      externalId: message.externalId,
      level: "info",
      eventType: "llm_rejected",
      message: "Rejected generated card",
      metadata: { confidence: draft.confidence, reason }
    });
    await repo.markProcessed(message.externalId);
    return { status: "rejected", reason };
  }

  await repo.publishCard(sanitizePublicCardDraft(draft), message);
  await repo.markProcessed(message.externalId);
  return { status: "published" };
}
