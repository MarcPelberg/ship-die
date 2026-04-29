import { createHash } from "node:crypto";
import type { CardDraft, RawMessageInput } from "../domain/types.js";
import { sanitizePublicCardDraft } from "../domain/public-card.js";
import { domainFromUrl, extractUrls } from "../domain/urls.js";
import type { PipelineEvent, PipelineRepo } from "../pipeline/process-message.js";
import type { Db } from "./client.js";

type RawMessageRow = {
  external_id: string;
  group_id: string;
  occurred_at: Date;
  text: string;
  raw: unknown;
};

export class Repositories implements PipelineRepo {
  constructor(private readonly db: Db) {}

  async insertRawMessage(message: RawMessageInput): Promise<void> {
    await this.db.query(
      `insert into raw_messages (external_id, group_id, sender_hash, occurred_at, text, links, raw)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (external_id) do nothing`,
      [
        message.externalId,
        message.groupId,
        message.senderId ? sha256(message.senderId) : null,
        message.occurredAt,
        message.text,
        extractUrls(message.text),
        JSON.stringify(message.raw ?? {})
      ]
    );
  }

  async pendingRawMessages(limit = 25): Promise<RawMessageInput[]> {
    const result = await this.db.query<RawMessageRow>(
      `select external_id, group_id, occurred_at, text, raw
       from raw_messages
       where processed_at is null
       order by occurred_at asc
       limit $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      externalId: row.external_id,
      groupId: row.group_id,
      occurredAt: row.occurred_at,
      text: row.text,
      raw: row.raw
    }));
  }

  async publishCard(card: CardDraft, message: RawMessageInput): Promise<void> {
    const publicCard = sanitizePublicCardDraft(card);
    await this.db.query(
      `with upserted_card as (
         insert into cards (
           slug,
           title,
           summary,
           canonical_type,
           tags,
           source_url,
           source_domain,
           source_note,
           discovered_at,
           confidence,
           metadata
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         on conflict (source_url) where source_url is not null
         do update set
           title = excluded.title,
           summary = excluded.summary,
           canonical_type = excluded.canonical_type,
           tags = excluded.tags,
           source_note = 'duplicate merged',
           confidence = greatest(cards.confidence, excluded.confidence)
         returning id
       )
       insert into card_sources (card_id, raw_message_id)
       select upserted_card.id, raw_messages.id
       from upserted_card
       join raw_messages on raw_messages.external_id = $12
       on conflict do nothing`,
      [
        buildCardSlug(publicCard, message),
        publicCard.title,
        publicCard.summary,
        publicCard.canonicalType,
        publicCard.tags,
        publicCard.sourceUrl ?? null,
        domainFromUrl(publicCard.sourceUrl) ?? null,
        publicCard.sourceNote,
        message.occurredAt,
        publicCard.confidence,
        JSON.stringify({ generatedBy: "deepseek" }),
        message.externalId
      ]
    );
  }

  async markProcessed(externalId: string): Promise<void> {
    await this.db.query("update raw_messages set processed_at = now() where external_id = $1", [externalId]);
  }

  async logEvent(event: PipelineEvent): Promise<void> {
    await this.db.query(
      `insert into processing_events (raw_message_id, level, event_type, message, metadata)
       values (
         (select id from raw_messages where external_id = $1),
         $2,
         $3,
         $4,
         $5
       )`,
      [
        event.externalId,
        event.level,
        event.eventType,
        event.message,
        JSON.stringify(event.metadata ?? {})
      ]
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildCardSlug(card: CardDraft, message: RawMessageInput): string {
  const identity = [message.externalId, card.sourceUrl ?? "", card.title].join("|");
  return `${slugify(card.title)}-${sha256(identity).slice(0, 12)}`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "card";
}
