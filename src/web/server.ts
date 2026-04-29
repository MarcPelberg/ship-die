import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { env } from "../config/env.js";
import { createDb } from "../db/client.js";
import { CANONICAL_TYPES } from "../domain/taxonomy.js";
import type { CanonicalType } from "../domain/types.js";
import { renderHome, type PublicCard } from "./render.js";

type CardRow = {
  title: string;
  summary: string;
  canonical_type: CanonicalType;
  tags: string[];
  source_url: string | null;
  source_note: string;
  published_at: Date;
};

type LatestRawMessageRow = {
  external_id: string;
  occurred_at: Date;
  text: string;
};

const db = createDb();
const app = new Hono();

app.get("/", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  const type = (c.req.query("type") ?? "").trim();
  const filters: string[] = [];
  const values: string[] = [];

  if (query) {
    values.push(query);
    filters.push(`search_vector @@ plainto_tsquery('english', $${values.length})`);
  }

  if (CANONICAL_TYPES.includes(type as CanonicalType)) {
    values.push(type);
    filters.push(`canonical_type = $${values.length}`);
  }

  const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
  const result = await db.query<CardRow>(
    `select title, summary, canonical_type, tags, source_url, source_note, published_at
     from cards
     ${where}
     order by published_at desc
     limit 100`,
    values
  );

  return c.html(renderHome({
    query,
    type: CANONICAL_TYPES.includes(type as CanonicalType) ? type : "",
    cards: result.rows.map(toPublicCard)
  }));
});

app.get("/healthz", (c) => c.json({ ok: true }));

app.get("/admin", async (c) => {
  if (c.req.header("x-admin-token") !== env.adminToken) {
    return c.notFound();
  }

  const [cards, pendingMessages, latestRawMessage] = await Promise.all([
    db.query<{ count: string }>("select count(*) from cards"),
    db.query<{ count: string }>("select count(*) from raw_messages where processed_at is null"),
    db.query<LatestRawMessageRow>(
      `select external_id, occurred_at, text
       from raw_messages
       order by occurred_at desc
       limit 1`
    )
  ]);

  const latest = latestRawMessage.rows[0];
  return c.json({
    cards: Number(cards.rows[0]?.count ?? 0),
    pendingMessages: Number(pendingMessages.rows[0]?.count ?? 0),
    latestRawMessage: latest
      ? {
          externalId: latest.external_id,
          occurredAt: latest.occurred_at.toISOString(),
          text: latest.text
        }
      : null
  });
});

serve({ fetch: app.fetch, port: env.port });
console.log(`Ship != Die listening on http://localhost:${env.port}`);

function toPublicCard(row: CardRow): PublicCard {
  return {
    title: row.title,
    summary: row.summary,
    canonicalType: row.canonical_type,
    tags: row.tags,
    sourceUrl: row.source_url ?? undefined,
    sourceNote: row.source_note,
    publishedAt: row.published_at
  };
}
