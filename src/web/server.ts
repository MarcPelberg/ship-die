import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "../config/env.js";
import { createDb } from "../db/client.js";
import { CANONICAL_TYPES } from "../domain/taxonomy.js";
import type { CanonicalType } from "../domain/types.js";
import { PAGE_SIZE, renderEntry, renderEntryError, renderHome, type PublicCard } from "./render.js";
import { archiveSearch } from "./search.js";
import { archiveStyles } from "./styles.js";
import { joinRoutes } from "./join.js";

type CardRow = {
  slug: string;
  title: string;
  summary: string;
  canonical_type: CanonicalType;
  tags: string[];
  source_url: string | null;
  source_note: string;
  discovered_at: Date;
  published_at: Date;
};

type LatestRawMessageRow = {
  external_id: string;
  occurred_at: Date;
};

export type AdminStatusDb = {
  query<T>(sql: string): Promise<{ rows: T[] }>;
};

const db = createDb();
export const app = new Hono();
app.route("/join", joinRoutes(db));
const publicColumns = "slug, title, summary, canonical_type, tags, source_url, source_note, discovered_at, published_at";

app.get("/archive.css", c => c.body(archiveStyles, 200, { "Content-Type": "text/css; charset=utf-8" }));
app.get("/archive.js", c => c.body(archiveSearch, 200, { "Content-Type": "text/javascript; charset=utf-8" }));
app.get("/archivo-latin.woff2", async c => {
  const data = await readFile(resolve("src/web/assets/archivo-latin.woff2"));
  return c.body(new Uint8Array(data), 200, { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=86400" });
});

app.get("/", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  const requestedType = (c.req.query("type") ?? "").trim() as CanonicalType;
  const type = CANONICAL_TYPES.includes(requestedType) ? requestedType : "";
  const requestedPage = Number(c.req.query("page"));
  const filters = query
    ? ["(search_vector @@ plainto_tsquery('english', $1) or strpos(lower(title), lower($1)) > 0)"]
    : [];
  const values: (string | number)[] = query ? [query] : [];
  const where = () => filters.length ? `where ${filters.join(" and ")}` : "";
  try {
    const totals = await db.query<{ canonical_type: CanonicalType; count: number }>(
      `select canonical_type, count(*)::int as count from cards ${where()} group by canonical_type`, values
    );
    const counts = Object.fromEntries(totals.rows.map(row => [row.canonical_type, row.count]));
    const total = type ? counts[type] ?? 0 : totals.rows.reduce((sum, row) => sum + row.count, 0);
    const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, last)) : 1;
    if (type) filters.push(`canonical_type = $${values.push(type)}`);
    const ranking = query ? "ts_rank(search_vector, plainto_tsquery('english', $1)) desc," : "";
    const result = await db.query<CardRow>(
      `select ${publicColumns}
       from cards ${where()} order by ${ranking} discovered_at desc, published_at desc, slug
       limit ${PAGE_SIZE} offset $${values.push((page - 1) * PAGE_SIZE)}`, values
    );
    return c.html(renderHome({ query, type, page, counts, cards: result.rows.map(toPublicCard) }));
  } catch (error) {
    console.error("Could not load the public archive", error instanceof Error ? error.name : "unknown error");
    return c.html(renderHome({ query, type, page: Number.isSafeInteger(requestedPage) ? requestedPage : 1, cards: [], unavailable: true }), 503);
  }
});

app.get("/resources/:slug", async c => {
  const slug = c.req.param("slug");
  try {
    const result = await db.query<CardRow>(`select ${publicColumns} from cards where slug = $1`, [slug]);
    const row = result.rows[0];
    return row ? c.html(renderEntry(toPublicCard(row))) : c.html(renderEntryError(), 404);
  } catch (error) {
    console.error("Could not load the public entry", error instanceof Error ? error.name : "unknown error");
    return c.html(renderEntryError(slug), 503);
  }
});

app.get("/healthz", (c) => c.json({ ok: true }));

app.get("/admin", async (c) => {
  if (c.req.header("x-admin-token") !== env.adminToken) {
    return c.notFound();
  }

  return c.json(await buildAdminStatus(db));
});

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: env.port });
  console.log(`Ship != Die listening on http://localhost:${env.port}`);
}

export async function buildAdminStatus(statusDb: AdminStatusDb): Promise<{
  cards: number;
  pendingMessages: number;
  latestRawMessage: { externalId: string; occurredAt: string } | null;
}> {
  const [cards, pendingMessages, latestRawMessage] = await Promise.all([
    statusDb.query<{ count: string }>("select count(*) from cards"),
    statusDb.query<{ count: string }>("select count(*) from raw_messages where processed_at is null and not held_for_reconciliation"),
    statusDb.query<LatestRawMessageRow>(
      `select external_id, occurred_at
       from raw_messages
       order by occurred_at desc
       limit 1`
    )
  ]);

  const latest = latestRawMessage.rows[0];
  return {
    cards: Number(cards.rows[0]?.count ?? 0),
    pendingMessages: Number(pendingMessages.rows[0]?.count ?? 0),
    latestRawMessage: latest
      ? {
          externalId: latest.external_id,
          occurredAt: latest.occurred_at.toISOString()
        }
      : null
  };
}

export function toPublicCard(row: CardRow): PublicCard {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    canonicalType: row.canonical_type,
    tags: row.tags,
    sourceUrl: row.source_url ?? undefined,
    sourceNote: row.source_note,
    publishedAt: row.discovered_at
  };
}
