export type CanonicalType =
  | "agent harness"
  | "skill/workflow pack"
  | "memory/state"
  | "model"
  | "review/eval"
  | "tool"
  | "infra";

export type RawMessageInput = {
  externalId: string;
  groupId: string;
  senderId?: string;
  occurredAt: Date;
  text: string;
  raw?: unknown;
};

export type LinkMetadata = {
  url: string;
  canonicalUrl: string;
  title?: string;
  description?: string;
  siteName?: string;
};

export type CardDraft = {
  title: string;
  summary: string;
  canonicalType: CanonicalType;
  tags: string[];
  sourceUrl?: string;
  sourceNote: string;
  confidence: number;
  shouldPublish: boolean;
  rejectionReason?: string;
};
