# Ship != Die Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, searchable Ship != Die site that auto-ingests a WhatsApp group, filters useful drops, cleans private data, classifies by function, and publishes cards.

**Architecture:** Use one TypeScript Node application split into focused modules: ingestion adapters, domain cleanup/classification helpers, a DeepSeek-backed card generator, Postgres repositories, and a Hono web server. The first version is local-first and deployable to OVH with Docker Compose; WhatsApp and LLM integrations sit behind interfaces so brittle parts can be swapped.

**Tech Stack:** Node 24, TypeScript, Hono, Postgres, raw SQL migrations, Vitest, Baileys, OpenAI SDK against DeepSeek's OpenAI-compatible API, Docker Compose, Caddy.

---

## Scope Check

This plan covers one working vertical slice instead of separate subsystem plans because the useful v1 requires the app, pipeline, database, reader, and deploy shape to fit together. Each task is independently testable and ends with a commit.

## Current External Assumptions

- DeepSeek API base URL is `https://api.deepseek.com`.
- Use `deepseek-v4-flash` for default JSON extraction and `deepseek-v4-pro` only if a stronger pass is needed.
- Baileys is the first WhatsApp reader adapter because it supports linked-device WhatsApp access without Meta Business API. It is unofficial and should run on the dedicated Mexican WhatsApp account only.

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`: TypeScript config.
- `vitest.config.ts`: test config.
- `.env.example`: required runtime variables.
- `db/migrations/001_init.sql`: database schema and search indexes.
- `scripts/migrate.ts`: simple migration runner.
- `scripts/smoke.ts`: production smoke check.
- `src/config/env.ts`: typed environment parsing.
- `src/domain/types.ts`: shared domain types.
- `src/domain/pii.ts`: deterministic PII stripping and detection.
- `src/domain/urls.ts`: URL extraction and canonicalization.
- `src/domain/noise.ts`: deterministic chat-noise rejection.
- `src/domain/taxonomy.ts`: canonical types and validation.
- `src/metadata/fetch.ts`: public link metadata fetcher.
- `src/llm/provider.ts`: provider interface.
- `src/llm/prompts.ts`: prompts and JSON schema instructions.
- `src/llm/deepseek.ts`: DeepSeek provider implementation.
- `src/db/client.ts`: Postgres pool.
- `src/db/repositories.ts`: raw message, card, event, and status persistence.
- `src/pipeline/process-message.ts`: message-to-card orchestration.
- `src/ingest/adapter.ts`: ingestion interface.
- `src/ingest/fixture-reader.ts`: local fixture ingestion.
- `src/ingest/baileys-reader.ts`: WhatsApp linked-device reader.
- `src/worker/run-once.ts`: process pending raw messages.
- `src/web/render.ts`: HTML rendering for public and admin pages.
- `src/web/server.ts`: HTTP routes.
- `fixtures/sample-chat.json`: anonymized sample data from the provided chat excerpt.
- `tests/**`: focused tests for each unit.
- `Dockerfile`, `docker-compose.yml`, `Caddyfile`: OVH deployment.
- `docs/deploy/ovh.md`: deployment runbook.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ship-die",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/web/server.ts",
    "reader": "tsx src/ingest/baileys-reader.ts",
    "ingest:fixture": "tsx src/ingest/fixture-reader.ts fixtures/sample-chat.json",
    "worker": "tsx src/worker/run-once.ts",
    "db:migrate": "tsx scripts/migrate.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/src/web/server.js",
    "smoke": "tsx scripts/smoke.ts"
  },
  "dependencies": {
    "@hono/node-server": "2.0.0",
    "baileys": "7.0.0-rc.9",
    "cheerio": "1.2.0",
    "dotenv": "17.4.2",
    "hono": "4.12.15",
    "openai": "6.35.0",
    "pg": "8.20.0",
    "pino": "10.3.1",
    "qrcode-terminal": "0.12.0",
    "zod": "4.3.6"
  },
  "devDependencies": {
    "@types/node": "24.12.2",
    "@types/pg": "8.20.0",
    "tsx": "4.21.0",
    "typescript": "6.0.3",
    "vitest": "4.1.5"
  },
  "overrides": {
    "libsignal": "npm:libsignal@2.0.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    environment: "node"
  }
});
```

- [ ] **Step 4: Create `.env.example`**

```bash
DATABASE_URL=postgres://shipdie:shipdie@localhost:5432/shipdie
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
ADMIN_TOKEN=change-this-before-deploy
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_STRONG_MODEL=deepseek-v4-pro
WHATSAPP_GROUP_JID=
WHATSAPP_AUTH_DIR=.data/wa-auth
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and install exits with code `0`.

- [ ] **Step 6: Run baseline checks**

Run: `npm run typecheck`

Expected: FAIL with `No inputs were found` or equivalent because `src/` files do not exist yet.

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .env.example
git commit -m "chore: scaffold TypeScript app"
```

---

### Task 2: Typed Environment

**Files:**
- Create: `src/config/env.ts`
- Create: `tests/config/env.test.ts`

- [ ] **Step 1: Write the failing env test**

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env.js";

describe("parseEnv", () => {
  it("parses required runtime configuration", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      PORT: "3001",
      PUBLIC_BASE_URL: "http://localhost:3001",
      ADMIN_TOKEN: "secret-token",
      DEEPSEEK_API_KEY: "ds-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_STRONG_MODEL: "deepseek-v4-pro",
      WHATSAPP_GROUP_JID: "123@g.us",
      WHATSAPP_AUTH_DIR: ".data/wa-auth"
    });

    expect(env.port).toBe(3001);
    expect(env.deepseekModel).toBe("deepseek-v4-flash");
    expect(env.whatsappGroupJid).toBe("123@g.us");
  });

  it("rejects a missing database url", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config/env.test.ts`

Expected: FAIL because `src/config/env.ts` does not exist.

- [ ] **Step 3: Create `src/config/env.ts`**

```ts
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_TOKEN: z.string().min(8),
  DEEPSEEK_API_KEY: z.string().default(""),
  DEEPSEEK_MODEL: z.string().default("deepseek-v4-flash"),
  DEEPSEEK_STRONG_MODEL: z.string().default("deepseek-v4-pro"),
  WHATSAPP_GROUP_JID: z.string().default(""),
  WHATSAPP_AUTH_DIR: z.string().default(".data/wa-auth")
});

export type AppEnv = {
  databaseUrl: string;
  port: number;
  publicBaseUrl: string;
  adminToken: string;
  deepseekApiKey: string;
  deepseekModel: string;
  deepseekStrongModel: string;
  whatsappGroupJid: string;
  whatsappAuthDir: string;
};

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const parsed = EnvSchema.parse(input);
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    publicBaseUrl: parsed.PUBLIC_BASE_URL,
    adminToken: parsed.ADMIN_TOKEN,
    deepseekApiKey: parsed.DEEPSEEK_API_KEY,
    deepseekModel: parsed.DEEPSEEK_MODEL,
    deepseekStrongModel: parsed.DEEPSEEK_STRONG_MODEL,
    whatsappGroupJid: parsed.WHATSAPP_GROUP_JID,
    whatsappAuthDir: parsed.WHATSAPP_AUTH_DIR
  };
}

export const env = parseEnv(process.env);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/config/env.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit env parsing**

```bash
git add src/config/env.ts tests/config/env.test.ts
git commit -m "chore: add typed environment config"
```

---

### Task 3: Database Schema And Migration Runner

**Files:**
- Create: `db/migrations/001_init.sql`
- Create: `scripts/migrate.ts`
- Create: `src/db/client.ts`

- [ ] **Step 1: Create `db/migrations/001_init.sql`**

```sql
create extension if not exists pgcrypto;

create table if not exists raw_messages (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  group_id text not null,
  sender_hash text,
  occurred_at timestamptz not null,
  text text not null default '',
  links text[] not null default '{}',
  raw jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  canonical_type text not null,
  tags text[] not null default '{}',
  source_url text,
  source_domain text,
  source_note text not null,
  discovered_at timestamptz not null,
  published_at timestamptz not null default now(),
  confidence numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(canonical_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(source_url, '')), 'D')
  ) stored
);

create table if not exists card_sources (
  card_id uuid not null references cards(id) on delete cascade,
  raw_message_id uuid not null references raw_messages(id) on delete cascade,
  primary key (card_id, raw_message_id)
);

create table if not exists processing_events (
  id uuid primary key default gen_random_uuid(),
  raw_message_id uuid references raw_messages(id) on delete set null,
  level text not null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists system_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_raw_messages_processed on raw_messages(processed_at) where processed_at is null;
create index if not exists idx_cards_published_at on cards(published_at desc);
create index if not exists idx_cards_type on cards(canonical_type);
create index if not exists idx_cards_search on cards using gin(search_vector);
```

- [ ] **Step 2: Create `src/db/client.ts`**

```ts
import pg from "pg";
import { env } from "../config/env.js";

export type Db = pg.Pool;

export function createDb(databaseUrl = env.databaseUrl): Db {
  return new pg.Pool({ connectionString: databaseUrl });
}

export async function closeDb(db: Db): Promise<void> {
  await db.end();
}
```

- [ ] **Step 3: Create `scripts/migrate.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createDb, closeDb } from "../src/db/client.js";

async function main() {
  const db = createDb();
  try {
    await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const dir = path.resolve("db/migrations");
    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const existing = await db.query("select 1 from schema_migrations where name = $1", [file]);
      if (existing.rowCount) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await db.query("begin");
      await db.query(sql);
      await db.query("insert into schema_migrations (name) values ($1)", [file]);
      await db.query("commit");
      console.log(`applied ${file}`);
    }
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit database foundation**

```bash
git add db/migrations/001_init.sql scripts/migrate.ts src/db/client.ts
git commit -m "feat: add database schema"
```

---

### Task 4: Domain Cleanup, URLs, Noise, And Taxonomy

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/pii.ts`
- Create: `src/domain/urls.ts`
- Create: `src/domain/noise.ts`
- Create: `src/domain/taxonomy.ts`
- Create: `tests/domain/pii.test.ts`
- Create: `tests/domain/urls.test.ts`
- Create: `tests/domain/noise.test.ts`
- Create: `tests/domain/taxonomy.test.ts`

- [ ] **Step 1: Write domain tests**

```ts
// tests/domain/pii.test.ts
import { describe, expect, it } from "vitest";
import { containsPII, stripPII } from "../../src/domain/pii.js";

describe("pii", () => {
  it("strips emails and phone-like numbers", () => {
    const cleaned = stripPII("Email me at a@b.com or +52 1 998 345 1651");
    expect(cleaned).toBe("Email me at [email] or [phone]");
    expect(containsPII(cleaned)).toBe(false);
  });
});
```

```ts
// tests/domain/urls.test.ts
import { describe, expect, it } from "vitest";
import { canonicalizeUrl, extractUrls } from "../../src/domain/urls.js";

describe("urls", () => {
  it("extracts and canonicalizes urls", () => {
    expect(extractUrls("see https://github.com/garrytan/gstack?utm_source=x")).toEqual([
      "https://github.com/garrytan/gstack?utm_source=x"
    ]);
    expect(canonicalizeUrl("https://github.com/garrytan/gstack/?utm_source=x")).toBe("https://github.com/garrytan/gstack");
  });
});
```

```ts
// tests/domain/noise.test.ts
import { describe, expect, it } from "vitest";
import { isNoiseMessage } from "../../src/domain/noise.js";

describe("noise detection", () => {
  it("rejects admin chatter and acknowledgments", () => {
    expect(isNoiseMessage("You changed the group description. Click to view.")).toBe(true);
    expect(isNoiseMessage("Thank you")).toBe(true);
    expect(isNoiseMessage("https://github.com/gastownhall/beads")).toBe(false);
  });
});
```

```ts
// tests/domain/taxonomy.test.ts
import { describe, expect, it } from "vitest";
import { normalizeCanonicalType } from "../../src/domain/taxonomy.js";

describe("taxonomy", () => {
  it("normalizes known canonical types and falls back to tool", () => {
    expect(normalizeCanonicalType("skill/workflow pack")).toBe("skill/workflow pack");
    expect(normalizeCanonicalType("framework")).toBe("tool");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/domain`

Expected: FAIL because domain files do not exist.

- [ ] **Step 3: Create domain files**

```ts
// src/domain/types.ts
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
```

```ts
// src/domain/pii.ts
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export function stripPII(text: string): string {
  return text.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[phone]").replace(/\s{2,}/g, " ").trim();
}

export function containsPII(text: string): boolean {
  return EMAIL_RE.test(text) || PHONE_RE.test(text);
}
```

```ts
// src/domain/urls.ts
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const TRACKING_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]);

export function extractUrls(text: string): string[] {
  return [...new Set(text.match(URL_RE) ?? [])];
}

export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const param of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) url.searchParams.delete(param);
  }
  url.hash = "";
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  url.pathname = pathname;
  return url.toString().replace(/\?$/, "");
}

export function domainFromUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  return new URL(rawUrl).hostname.replace(/^www\./, "");
}
```

```ts
// src/domain/noise.ts
const ADMIN_PATTERNS = [
  /changed the group description/i,
  /deleted this message/i,
  /you added/i,
  /joined using this group's invite link/i,
  /click to view/i
];

const ACKS = new Set(["thanks", "thank you", "👍", "+1", "ok", "got it"]);

export function isNoiseMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  if (ACKS.has(normalized)) return true;
  if (ADMIN_PATTERNS.some((pattern) => pattern.test(text))) return true;
  return normalized.length < 12 && !normalized.includes("http");
}
```

```ts
// src/domain/taxonomy.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/domain`

Expected: PASS.

- [ ] **Step 5: Commit domain helpers**

```bash
git add src/domain tests/domain
git commit -m "feat: add message cleanup domain helpers"
```

---

### Task 5: Link Metadata Fetcher

**Files:**
- Create: `src/metadata/fetch.ts`
- Create: `tests/metadata/fetch.test.ts`

- [ ] **Step 1: Write metadata test**

```ts
import { describe, expect, it } from "vitest";
import { extractMetadataFromHtml } from "../../src/metadata/fetch.js";

describe("extractMetadataFromHtml", () => {
  it("uses Open Graph metadata when available", () => {
    const meta = extractMetadataFromHtml("https://github.com/x/y", `
      <html><head>
        <meta property="og:title" content="Useful Repo">
        <meta property="og:description" content="Does useful agent work">
        <meta property="og:site_name" content="GitHub">
      </head></html>
    `);
    expect(meta).toEqual({
      url: "https://github.com/x/y",
      canonicalUrl: "https://github.com/x/y",
      title: "Useful Repo",
      description: "Does useful agent work",
      siteName: "GitHub"
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/metadata/fetch.test.ts`

Expected: FAIL because `src/metadata/fetch.ts` does not exist.

- [ ] **Step 3: Create `src/metadata/fetch.ts`**

```ts
import * as cheerio from "cheerio";
import type { LinkMetadata } from "../domain/types.js";
import { canonicalizeUrl } from "../domain/urls.js";

export function extractMetadataFromHtml(url: string, html: string): LinkMetadata {
  const $ = cheerio.load(html);
  const pick = (...selectors: string[]) => {
    for (const selector of selectors) {
      const value = $(selector).attr("content") || $(selector).text();
      if (value?.trim()) return value.trim();
    }
    return undefined;
  };

  return {
    url,
    canonicalUrl: canonicalizeUrl(url),
    title: pick('meta[property="og:title"]', "title"),
    description: pick('meta[property="og:description"]', 'meta[name="description"]'),
    siteName: pick('meta[property="og:site_name"]')
  };
}

export async function fetchLinkMetadata(url: string, fetchImpl: typeof fetch = fetch): Promise<LinkMetadata> {
  const response = await fetchImpl(url, {
    headers: { "user-agent": "ShipDieBot/0.1 (+https://ship-die.local)" },
    redirect: "follow"
  });
  const html = await response.text();
  return extractMetadataFromHtml(response.url || url, html);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/metadata/fetch.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit metadata fetcher**

```bash
git add src/metadata tests/metadata
git commit -m "feat: add link metadata extraction"
```

---

### Task 6: DeepSeek Provider

**Files:**
- Create: `src/llm/provider.ts`
- Create: `src/llm/prompts.ts`
- Create: `src/llm/deepseek.ts`
- Create: `tests/llm/deepseek.test.ts`

- [ ] **Step 1: Write DeepSeek parsing test**

```ts
import { describe, expect, it } from "vitest";
import { parseDeepSeekCardDraft } from "../../src/llm/deepseek.js";

describe("parseDeepSeekCardDraft", () => {
  it("normalizes canonical type and tags", () => {
    const draft = parseDeepSeekCardDraft(JSON.stringify({
      title: "Claude Octopus",
      summary: "Multi-model review for coding tasks.",
      canonicalType: "review/eval",
      tags: ["Debugging", "multi-model", "debugging"],
      sourceUrl: "https://github.com/nyldn/claude-octopus",
      sourceNote: "github repo",
      confidence: 0.91,
      shouldPublish: true
    }));

    expect(draft.canonicalType).toBe("review/eval");
    expect(draft.tags).toEqual(["debugging", "multi-model"]);
    expect(draft.shouldPublish).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/llm/deepseek.test.ts`

Expected: FAIL because LLM files do not exist.

- [ ] **Step 3: Create LLM provider files**

```ts
// src/llm/provider.ts
import type { CardDraft, LinkMetadata, RawMessageInput } from "../domain/types.js";

export type CardGenerationInput = {
  message: RawMessageInput;
  cleanedText: string;
  links: LinkMetadata[];
};

export interface LlmProvider {
  generateCard(input: CardGenerationInput): Promise<CardDraft>;
}
```

```ts
// src/llm/prompts.ts
export const CARD_SYSTEM_PROMPT = `
You convert WhatsApp group messages into public knowledge cards for builders.
Return only JSON.
Do not quote private chat directly unless the source is a public URL title.
Strip names, emails, phone numbers, and casual chatter.
Classify by what the item actually does, not by what the sender calls it.

Allowed canonicalType values:
- agent harness
- skill/workflow pack
- memory/state
- model
- review/eval
- tool
- infra

Return this JSON shape:
{
  "title": "short title",
  "summary": "1-2 sentence practical summary",
  "canonicalType": "one allowed value",
  "tags": ["lowercase", "specific"],
  "sourceUrl": "https://example.com or empty string",
  "sourceNote": "github repo | no public link | duplicate merged | from group, cleaned",
  "confidence": 0.0,
  "shouldPublish": true,
  "rejectionReason": "empty when shouldPublish is true"
}

Publish only durable builder value: repos, tools, workflows, model comparisons, infra tips, eval/review methods, or field reports.
Reject admin events, thanks, invites, pure questions without reusable information, and off-topic chatter.
`;
```

```ts
// src/llm/deepseek.ts
import OpenAI from "openai";
import { z } from "zod";
import { stripPII } from "../domain/pii.js";
import { normalizeCanonicalType, normalizeTags } from "../domain/taxonomy.js";
import type { CardDraft } from "../domain/types.js";
import type { CardGenerationInput, LlmProvider } from "./provider.js";
import { CARD_SYSTEM_PROMPT } from "./prompts.js";

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
  const parsed = DraftSchema.parse(JSON.parse(content));
  return {
    title: stripPII(parsed.title),
    summary: stripPII(parsed.summary),
    canonicalType: normalizeCanonicalType(parsed.canonicalType),
    tags: normalizeTags(parsed.tags),
    sourceUrl: parsed.sourceUrl || undefined,
    sourceNote: stripPII(parsed.sourceNote),
    confidence: parsed.confidence,
    shouldPublish: parsed.shouldPublish,
    rejectionReason: parsed.rejectionReason ? stripPII(parsed.rejectionReason) : undefined
  };
}

export type DeepSeekConfig = {
  apiKey: string;
  model: string;
};

export class DeepSeekProvider implements LlmProvider {
  private client: OpenAI;

  constructor(private config: DeepSeekConfig) {
    if (!config.apiKey) throw new Error("DEEPSEEK_API_KEY is required to call DeepSeek");
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.deepseek.com"
    });
  }

  async generateCard(input: CardGenerationInput): Promise<CardDraft> {
    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: "system", content: CARD_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) }
      ],
      response_format: { type: "json_object" },
      stream: false
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned an empty card response");
    return parseDeepSeekCardDraft(content);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/llm/deepseek.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit DeepSeek provider**

```bash
git add src/llm tests/llm
git commit -m "feat: add DeepSeek card provider"
```

---

### Task 7: Repositories And Pipeline

**Files:**
- Create: `src/db/repositories.ts`
- Create: `src/pipeline/process-message.ts`
- Create: `tests/pipeline/process-message.test.ts`

- [ ] **Step 1: Write pipeline unit test with fake dependencies**

```ts
import { describe, expect, it, vi } from "vitest";
import { processMessage } from "../../src/pipeline/process-message.js";

describe("processMessage", () => {
  it("rejects noise before calling the LLM", async () => {
    const provider = { generateCard: vi.fn() };
    const repo = { publishCard: vi.fn(), markProcessed: vi.fn(), logEvent: vi.fn() };

    const result = await processMessage({
      message: {
        externalId: "1",
        groupId: "g",
        occurredAt: new Date("2026-04-29T12:00:00Z"),
        text: "Thank you"
      },
      provider,
      repo,
      fetchMetadata: vi.fn()
    });

    expect(result.status).toBe("rejected");
    expect(provider.generateCard).not.toHaveBeenCalled();
    expect(repo.markProcessed).toHaveBeenCalledWith("1");
  });

  it("publishes a cleaned useful card", async () => {
    const provider = {
      generateCard: vi.fn().mockResolvedValue({
        title: "Beads",
        summary: "Memory layer for coding agents.",
        canonicalType: "memory/state",
        tags: ["agent memory"],
        sourceUrl: "https://github.com/gastownhall/beads",
        sourceNote: "github repo",
        confidence: 0.9,
        shouldPublish: true
      })
    };
    const repo = { publishCard: vi.fn(), markProcessed: vi.fn(), logEvent: vi.fn() };

    const result = await processMessage({
      message: {
        externalId: "2",
        groupId: "g",
        occurredAt: new Date("2026-04-29T12:00:00Z"),
        text: "https://github.com/gastownhall/beads"
      },
      provider,
      repo,
      fetchMetadata: vi.fn().mockResolvedValue({
        url: "https://github.com/gastownhall/beads",
        canonicalUrl: "https://github.com/gastownhall/beads",
        title: "Beads"
      })
    });

    expect(result.status).toBe("published");
    expect(repo.publishCard).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/process-message.test.ts`

Expected: FAIL because pipeline files do not exist.

- [ ] **Step 3: Create `src/pipeline/process-message.ts`**

```ts
import { stripPII } from "../domain/pii.js";
import { isNoiseMessage } from "../domain/noise.js";
import { canonicalizeUrl, extractUrls } from "../domain/urls.js";
import type { CardDraft, LinkMetadata, RawMessageInput } from "../domain/types.js";
import type { LlmProvider } from "../llm/provider.js";

export type PipelineRepo = {
  publishCard(card: CardDraft, message: RawMessageInput): Promise<void>;
  markProcessed(externalId: string): Promise<void>;
  logEvent(event: { externalId?: string; level: "info" | "warn" | "error"; eventType: string; message: string; metadata?: unknown }): Promise<void>;
};

export type ProcessMessageInput = {
  message: RawMessageInput;
  provider: LlmProvider;
  repo: PipelineRepo;
  fetchMetadata(url: string): Promise<LinkMetadata>;
};

export type ProcessResult = { status: "published" | "rejected"; reason?: string };

export async function processMessage(input: ProcessMessageInput): Promise<ProcessResult> {
  const { message, provider, repo, fetchMetadata } = input;
  if (isNoiseMessage(message.text)) {
    await repo.logEvent({ externalId: message.externalId, level: "info", eventType: "noise_rejected", message: "Rejected deterministic noise" });
    await repo.markProcessed(message.externalId);
    return { status: "rejected", reason: "noise" };
  }

  const urls = extractUrls(message.text).map(canonicalizeUrl);
  const metadata = await Promise.all(urls.map((url) => fetchMetadata(url).catch(() => ({ url, canonicalUrl: url }))));
  const cleanedText = stripPII(message.text);
  const draft = await provider.generateCard({ message, cleanedText, links: metadata });

  if (!draft.shouldPublish || draft.confidence < 0.68) {
    await repo.logEvent({
      externalId: message.externalId,
      level: "info",
      eventType: "llm_rejected",
      message: draft.rejectionReason || "Rejected by value filter",
      metadata: { confidence: draft.confidence }
    });
    await repo.markProcessed(message.externalId);
    return { status: "rejected", reason: draft.rejectionReason || "low_confidence" };
  }

  await repo.publishCard(draft, message);
  await repo.markProcessed(message.externalId);
  return { status: "published" };
}
```

- [ ] **Step 4: Create `src/db/repositories.ts`**

```ts
import crypto from "node:crypto";
import type { Db } from "./client.js";
import type { CardDraft, RawMessageInput } from "../domain/types.js";
import { domainFromUrl, extractUrls } from "../domain/urls.js";
import type { PipelineRepo } from "../pipeline/process-message.js";

function slugify(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
  return base || crypto.randomUUID();
}

function senderHash(senderId?: string): string | null {
  if (!senderId) return null;
  return crypto.createHash("sha256").update(senderId).digest("hex");
}

export class Repositories implements PipelineRepo {
  constructor(private db: Db) {}

  async insertRawMessage(message: RawMessageInput): Promise<void> {
    await this.db.query(
      `insert into raw_messages (external_id, group_id, sender_hash, occurred_at, text, links, raw)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (external_id) do nothing`,
      [
        message.externalId,
        message.groupId,
        senderHash(message.senderId),
        message.occurredAt,
        message.text,
        extractUrls(message.text),
        message.raw ?? {}
      ]
    );
  }

  async pendingRawMessages(limit = 25): Promise<RawMessageInput[]> {
    const result = await this.db.query(
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
    const slugBase = slugify(card.title);
    const sourceDomain = domainFromUrl(card.sourceUrl);
    await this.db.query(
      `insert into cards (slug, title, summary, canonical_type, tags, source_url, source_domain, source_note, discovered_at, confidence, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (source_url) where source_url is not null do update set
         title = excluded.title,
         summary = excluded.summary,
         canonical_type = excluded.canonical_type,
         tags = excluded.tags,
         source_note = 'duplicate merged',
         confidence = greatest(cards.confidence, excluded.confidence)`,
      [
        `${slugBase}-${message.externalId.slice(-8)}`,
        card.title,
        card.summary,
        card.canonicalType,
        card.tags,
        card.sourceUrl ?? null,
        sourceDomain ?? null,
        card.sourceNote,
        message.occurredAt,
        card.confidence,
        { generatedBy: "deepseek" }
      ]
    );
  }

  async markProcessed(externalId: string): Promise<void> {
    await this.db.query("update raw_messages set processed_at = now() where external_id = $1", [externalId]);
  }

  async logEvent(event: { externalId?: string; level: "info" | "warn" | "error"; eventType: string; message: string; metadata?: unknown }): Promise<void> {
    await this.db.query(
      `insert into processing_events (raw_message_id, level, event_type, message, metadata)
       values ((select id from raw_messages where external_id = $1), $2, $3, $4, $5)`,
      [event.externalId ?? null, event.level, event.eventType, event.message, event.metadata ?? {}]
    );
  }
}
```

- [ ] **Step 5: Fix unique source URL index**

Add this statement to the bottom of `db/migrations/001_init.sql`:

```sql
create unique index if not exists idx_cards_source_url_unique on cards(source_url) where source_url is not null;
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test -- tests/pipeline/process-message.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit pipeline**

```bash
git add src/db/repositories.ts src/pipeline/process-message.ts tests/pipeline/process-message.test.ts db/migrations/001_init.sql
git commit -m "feat: add publishing pipeline"
```

---

### Task 8: Worker And Fixture Ingestion

**Files:**
- Create: `fixtures/sample-chat.json`
- Create: `src/ingest/adapter.ts`
- Create: `src/ingest/fixture-reader.ts`
- Create: `src/worker/run-once.ts`

- [ ] **Step 1: Create anonymized sample fixture**

```json
[
  {
    "externalId": "sample-001",
    "groupId": "ship-die-sample",
    "occurredAt": "2026-04-29T19:08:00.000Z",
    "text": "Here are two frameworks we discussed today: https://github.com/gastownhall/beads https://github.com/obra/superpowers"
  },
  {
    "externalId": "sample-002",
    "groupId": "ship-die-sample",
    "occurredAt": "2026-04-29T19:12:00.000Z",
    "text": "GPT 5.5 feels like the strongest overall coding model right now compared with Opus 4.6 and 4.7."
  },
  {
    "externalId": "sample-003",
    "groupId": "ship-die-sample",
    "occurredAt": "2026-04-29T19:24:00.000Z",
    "text": "https://github.com/garrytan/gstack"
  },
  {
    "externalId": "sample-004",
    "groupId": "ship-die-sample",
    "occurredAt": "2026-04-29T19:27:00.000Z",
    "text": "https://github.com/nyldn/claude-octopus"
  }
]
```

- [ ] **Step 2: Create ingestion interface and fixture reader**

```ts
// src/ingest/adapter.ts
import type { RawMessageInput } from "../domain/types.js";

export interface IngestAdapter {
  start(onMessage: (message: RawMessageInput) => Promise<void>): Promise<void>;
}
```

```ts
// src/ingest/fixture-reader.ts
import { readFile } from "node:fs/promises";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import type { RawMessageInput } from "../domain/types.js";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run ingest:fixture -- fixtures/sample-chat.json");
  const rows = JSON.parse(await readFile(file, "utf8")) as Array<Omit<RawMessageInput, "occurredAt"> & { occurredAt: string }>;
  const db = createDb();
  const repo = new Repositories(db);
  try {
    for (const row of rows) {
      await repo.insertRawMessage({ ...row, occurredAt: new Date(row.occurredAt) });
      console.log(`inserted ${row.externalId}`);
    }
  } finally {
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 3: Create worker**

```ts
// src/worker/run-once.ts
import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import { fetchLinkMetadata } from "../metadata/fetch.js";
import { DeepSeekProvider } from "../llm/deepseek.js";
import { processMessage } from "../pipeline/process-message.js";

async function main() {
  if (!env.whatsappGroupJid) throw new Error("WHATSAPP_GROUP_JID is required for the WhatsApp reader");
  const db = createDb();
  const repo = new Repositories(db);
  const provider = new DeepSeekProvider({ apiKey: env.deepseekApiKey, model: env.deepseekModel });
  try {
    const messages = await repo.pendingRawMessages(25);
    for (const message of messages) {
      const result = await processMessage({ message, provider, repo, fetchMetadata: fetchLinkMetadata });
      console.log(`${message.externalId}: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
    }
  } finally {
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit worker and fixture ingestion**

```bash
git add fixtures/sample-chat.json src/ingest src/worker/run-once.ts
git commit -m "feat: add fixture ingestion and worker"
```

---

### Task 9: Public Web Server

**Files:**
- Create: `src/web/render.ts`
- Create: `src/web/server.ts`
- Create: `tests/web/render.test.ts`

- [ ] **Step 1: Write renderer test**

```ts
import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/web/render.js";

describe("renderHome", () => {
  it("renders raw polished card list", () => {
    const html = renderHome({
      query: "",
      type: "",
      cards: [{
        title: "Beads",
        summary: "Memory layer for coding agents.",
        canonicalType: "memory/state",
        tags: ["coding agents"],
        sourceUrl: "https://github.com/gastownhall/beads",
        sourceNote: "github repo",
        publishedAt: new Date("2026-04-29T12:00:00Z")
      }]
    });

    expect(html).toContain("Ship != Die");
    expect(html).toContain("Memory layer for coding agents.");
    expect(html).toContain("memory/state");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/web/render.test.ts`

Expected: FAIL because renderer does not exist.

- [ ] **Step 3: Create renderer**

```ts
// src/web/render.ts
import { CANONICAL_TYPES } from "../domain/taxonomy.js";

export type PublicCard = {
  title: string;
  summary: string;
  canonicalType: string;
  tags: string[];
  sourceUrl?: string;
  sourceNote: string;
  publishedAt: Date;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char] as string));
}

function layout(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ship != Die</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f7f7f4;color:#151515;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4}
    header{background:#fff;border-bottom:1px solid #d7d7d0;padding:14px 18px}.header-inner{max-width:1120px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
    .brand{font-weight:800;font-size:19px}.sub{color:#555;font-size:13px;margin-top:1px}nav{display:flex;gap:14px;font-size:14px}nav a{color:#111;text-decoration:none;border-bottom:1px solid #777}
    main{max-width:1120px;margin:0 auto;padding:20px 18px 32px}.toolbar{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:10px;margin-bottom:10px}
    input{border:1px solid #b5b5ac;background:#fff;border-radius:4px;padding:10px 11px;font:inherit}button{border:1px solid #151515;background:#151515;color:#fff;border-radius:4px;padding:10px 16px;font:inherit}
    .filters{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}.filter{border:1px solid #c5c5bc;border-radius:999px;padding:4px 9px;font-size:13px;background:#fff;color:#333;text-decoration:none}.filter.active{background:#151515;color:#fff;border-color:#151515}
    .status-strip{display:flex;flex-wrap:wrap;gap:12px;color:#5c5c55;font-size:13px;padding:9px 0 13px;border-bottom:1px solid #d9d9d2}.status-strip strong{color:#191919;font-weight:700}
    .list{background:#fff;border:1px solid #d7d7d0;border-radius:6px;overflow:hidden;margin-top:14px}.row{display:grid;grid-template-columns:120px 1fr 155px;gap:16px;padding:14px 16px;border-bottom:1px solid #e4e4dc}.row:last-child{border-bottom:0}
    .date{color:#60605a;font-size:13px;padding-top:2px}.item h2{font-size:17px;line-height:1.25;margin:0 0 5px}.item p{margin:0 0 8px;color:#343434}.meta{display:flex;flex-wrap:wrap;gap:6px}
    .tag{border:1px solid #cfcfc5;border-radius:999px;padding:2px 7px;font-size:12px;color:#333;background:#fafaf8}.type{background:#151515;color:#fff;border-color:#151515}.source{font-size:13px;color:#60605a;padding-top:2px}.source a{color:#111;text-decoration:none;border-bottom:1px solid #777;word-break:break-word}
    footer{max-width:1120px;margin:0 auto;padding:0 18px 24px;color:#66665f;font-size:13px}@media(max-width:760px){.header-inner{display:block}nav{margin-top:10px}.toolbar{grid-template-columns:1fr}.row{grid-template-columns:1fr;gap:7px}.source{padding-top:0}}
  </style>
</head>
<body><header><div class="header-inner"><div><div class="brand">Ship != Die</div><div class="sub">useful drops from the group, cleaned and searchable</div></div><nav><a href="/">latest</a><a href="/admin">status</a><a href="#">repo</a></nav></div></header>${body}<footer>raw WhatsApp data stays private · public site shows cleaned cards only</footer></body></html>`;
}

export function renderHome(input: { query: string; type: string; cards: PublicCard[] }): string {
  const filters = ["all", ...CANONICAL_TYPES].map((type) => {
    const active = (!input.type && type === "all") || input.type === type;
    const href = type === "all" ? "/" : `/?type=${encodeURIComponent(type)}`;
    return `<a class="filter ${active ? "active" : ""}" href="${href}">${escapeHtml(type)}</a>`;
  }).join("");

  const rows = input.cards.map((card) => {
    const tags = [`<span class="tag type">${escapeHtml(card.canonicalType)}</span>`, ...card.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)].join("");
    const source = card.sourceUrl ? `<a href="${escapeHtml(card.sourceUrl)}" rel="nofollow noopener">${escapeHtml(new URL(card.sourceUrl).hostname.replace(/^www\\./, ""))}</a><br>${escapeHtml(card.sourceNote)}` : escapeHtml(card.sourceNote);
    return `<article class="row"><div class="date">${card.publishedAt.toISOString().slice(0, 10)}</div><div class="item"><h2>${escapeHtml(card.title)}</h2><p>${escapeHtml(card.summary)}</p><div class="meta">${tags}</div></div><div class="source">${source}</div></article>`;
  }).join("");

  return layout(`<main><form class="toolbar" action="/"><input name="q" value="${escapeHtml(input.query)}" placeholder="search harnesses, skills, models, workflows, repos"><button type="submit">search</button></form><div class="filters">${filters}</div><div class="status-strip"><span><strong>${input.cards.length}</strong> shown</span><span>duplicates merged</span><span>names, emails, phones stripped</span><span>raw WhatsApp private</span></div><section class="list">${rows || "<article class=\"row\"><div></div><div class=\"item\"><h2>No cards found</h2><p>Try a broader search.</p></div><div></div></article>"}</section></main>`);
}
```

- [ ] **Step 4: Create server**

```ts
// src/web/server.ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { env } from "../config/env.js";
import { createDb } from "../db/client.js";
import { renderHome } from "./render.js";

const app = new Hono();
const db = createDb();

app.get("/", async (c) => {
  const query = c.req.query("q") ?? "";
  const type = c.req.query("type") ?? "";
  const values: unknown[] = [];
  const where: string[] = [];

  if (query) {
    values.push(query);
    where.push(`search_vector @@ plainto_tsquery('english', $${values.length})`);
  }
  if (type) {
    values.push(type);
    where.push(`canonical_type = $${values.length}`);
  }

  const sql = `select title, summary, canonical_type, tags, source_url, source_note, published_at
               from cards
               ${where.length ? `where ${where.join(" and ")}` : ""}
               order by published_at desc
               limit 100`;
  const result = await db.query(sql, values);
  return c.html(renderHome({
    query,
    type,
    cards: result.rows.map((row) => ({
      title: row.title,
      summary: row.summary,
      canonicalType: row.canonical_type,
      tags: row.tags,
      sourceUrl: row.source_url ?? undefined,
      sourceNote: row.source_note,
      publishedAt: row.published_at
    }))
  }));
});

app.get("/healthz", (c) => c.json({ ok: true }));

app.get("/admin", async (c) => {
  if (c.req.header("x-admin-token") !== env.adminToken) return c.text("not found", 404);
  const cards = await db.query("select count(*)::int as count from cards");
  const pending = await db.query("select count(*)::int as count from raw_messages where processed_at is null");
  const latest = await db.query("select max(created_at) as latest from raw_messages");
  return c.json({
    cards: cards.rows[0].count,
    pendingMessages: pending.rows[0].count,
    latestRawMessage: latest.rows[0].latest
  });
});

serve({ fetch: app.fetch, port: env.port });
console.log(`Ship != Die listening on ${env.port}`);
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- tests/web/render.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit web server**

```bash
git add src/web tests/web
git commit -m "feat: add public card site"
```

---

### Task 10: WhatsApp Reader Adapter

**Files:**
- Create: `src/ingest/baileys-reader.ts`

- [ ] **Step 1: Create Baileys reader**

```ts
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "baileys";
import P from "pino";
import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import type { RawMessageInput } from "../domain/types.js";

function messageText(message: any): string {
  return message?.conversation
    || message?.extendedTextMessage?.text
    || message?.imageMessage?.caption
    || message?.videoMessage?.caption
    || "";
}

async function main() {
  const db = createDb();
  const repo = new Repositories(db);
  const { state, saveCreds } = await useMultiFileAuthState(env.whatsappAuthDir);
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "info" }),
    browser: ["ShipDie", "Chrome", "0.1"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const code = (update.lastDisconnect?.error as any)?.output?.statusCode;
    console.log("whatsapp connection", { connection: update.connection, qr: Boolean(update.qr), code });
    if (update.connection === "close" && code !== DisconnectReason.loggedOut) {
      console.log("connection closed; restart the reader process to reconnect");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const item of messages) {
      if (item.key.remoteJid !== env.whatsappGroupJid) continue;
      const text = messageText(item.message);
      if (!text) continue;
      const raw: RawMessageInput = {
        externalId: item.key.id || `${item.key.remoteJid}-${Date.now()}`,
        groupId: item.key.remoteJid || env.whatsappGroupJid,
        senderId: item.key.participant,
        occurredAt: new Date((Number(item.messageTimestamp) || Date.now() / 1000) * 1000),
        text,
        raw: item
      };
      await repo.insertRawMessage(raw);
      console.log(`stored whatsapp message ${raw.externalId}`);
    }
  });

  process.on("SIGINT", async () => {
    await closeDb(db);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Commit WhatsApp reader**

```bash
git add src/ingest/baileys-reader.ts
git commit -m "feat: add WhatsApp reader adapter"
```

---

### Task 11: Docker And OVH Deployment

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `Caddyfile`
- Create: `scripts/smoke.ts`
- Create: `docs/deploy/ovh.md`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "dist/src/web/server.js"]
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: shipdie
      POSTGRES_PASSWORD: shipdie
      POSTGRES_DB: shipdie
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shipdie -d shipdie"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    command: ["node", "dist/src/web/server.js"]

  worker:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    command: ["sh", "-c", "while true; do node dist/src/worker/run-once.js; sleep 60; done"]

  reader:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - whatsapp-auth:/app/.data/wa-auth
    command: ["node", "dist/src/ingest/baileys-reader.js"]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config

volumes:
  postgres-data:
  whatsapp-auth:
  caddy-data:
  caddy-config:
```

- [ ] **Step 3: Create `Caddyfile`**

```caddyfile
{$SITE_DOMAIN} {
  encode gzip
  reverse_proxy app:3000
}
```

- [ ] **Step 4: Create smoke script**

```ts
// scripts/smoke.ts
import { env } from "../src/config/env.js";

async function main() {
  const response = await fetch(`${env.publicBaseUrl}/healthz`);
  if (!response.ok) throw new Error(`healthz failed: ${response.status}`);
  const body = await response.json() as { ok?: boolean };
  if (body.ok !== true) throw new Error("healthz returned unexpected body");
  console.log("smoke ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 5: Create `docs/deploy/ovh.md`**

```md
# OVH Deployment

## Server

Use an OVH VPS with Docker and Docker Compose installed.

## Required Secrets

Create `.env` on the server:

```bash
DATABASE_URL=postgres://shipdie:shipdie@postgres:5432/shipdie
PORT=3000
PUBLIC_BASE_URL=https://ship-die.local
ADMIN_TOKEN=replace-with-strong-admin-token
DEEPSEEK_API_KEY=deepseek-key-loaded-on-server
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_STRONG_MODEL=deepseek-v4-pro
WHATSAPP_GROUP_JID=ship-die-group@g.us
WHATSAPP_AUTH_DIR=.data/wa-auth
SITE_DOMAIN=ship-die.local
```

## First Deploy

```bash
git clone https://github.com/ship-die/ship-die.git ship-die
cd ship-die
cp .env.example .env
nano .env
docker compose up -d postgres
docker compose run --rm app node dist/scripts/migrate.js
docker compose up -d
docker compose logs -f reader
```

Scan the reader QR code with the dedicated Mexican WhatsApp account. Set `WHATSAPP_GROUP_JID` once the target group id is known from reader logs, then restart:

```bash
docker compose restart reader worker app
```

## Smoke Check

```bash
docker compose exec app node dist/scripts/smoke.js
```

## Backup

Run this from the server when needed:

```bash
docker compose exec -T postgres pg_dump -U shipdie shipdie > backup-$(date +%F).sql
```
```

- [ ] **Step 6: Run config checks**

Run: `docker compose config`

Expected: Docker Compose prints merged config without errors.

- [ ] **Step 7: Commit deployment files**

```bash
git add Dockerfile docker-compose.yml Caddyfile scripts/smoke.ts docs/deploy/ovh.md
git commit -m "chore: add OVH deployment config"
```

---

### Task 12: End-To-End Local Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Create `README.md`**

```md
# Ship != Die

Public, searchable archive of useful builder drops from the `/ship! = die development` WhatsApp group.

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run ingest:fixture
npm run worker
npm run dev
```

Open `http://localhost:3000`.

## Privacy

Raw WhatsApp data, member names, phone numbers, emails, API keys, and WhatsApp session files must never be committed. Public cards are cleaned summaries.

## Reader

Use the dedicated Mexican WhatsApp account. Do not use the user's personal account unless live ingestion is blocked and the user explicitly chooses that fallback.
```

- [ ] **Step 2: Run full checks**

Run: `npm test && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 3: Run local integration check**

Run:

```bash
docker compose up -d postgres
npm run db:migrate
npm run ingest:fixture
```

Expected:

- `npm run db:migrate` prints `applied 001_init.sql` on first run or no migration output on later runs.
- `npm run ingest:fixture` prints inserted sample ids.

Do not run `npm run worker` until `DEEPSEEK_API_KEY` is set in `.env`.

- [ ] **Step 4: Commit README**

```bash
git add README.md
git commit -m "docs: add local setup guide"
```

---

## Self-Review Checklist

- Spec coverage:
  - WhatsApp reader: Task 10.
  - Dedicated Mexican account: `.env` and docs in Tasks 10-12.
  - DeepSeek provider: Task 6.
  - Automatic pipeline: Tasks 7-8.
  - Privacy cleanup: Task 4 and Task 7.
  - Function-based classification: Task 4 and Task 6 prompt.
  - Public raw-polished UI: Task 9.
  - Postgres search: Tasks 3 and 9.
  - OVH deployment: Task 11.
- Placeholder scan: no incomplete implementation steps are intended.
- Type consistency:
  - `RawMessageInput`, `CardDraft`, `CanonicalType`, and `LlmProvider` are defined before use.
  - `Repositories` implements `PipelineRepo`.
  - Web renderer uses database row fields created by `001_init.sql`.
