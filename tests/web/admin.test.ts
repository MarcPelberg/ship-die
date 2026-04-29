import { describe, expect, it, vi } from "vitest";
import type { AdminStatusDb } from "../../src/web/server.js";

describe("admin status", () => {
  it("does not select or return raw message text", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    process.env.ADMIN_TOKEN = "secret-token";

    const { buildAdminStatus } = await import("../../src/web/server.js");
    const queries: string[] = [];
    const db = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("from cards")) {
          return { rows: [{ count: "1" }] };
        }
        if (sql.includes("processed_at is null")) {
          return { rows: [{ count: "2" }] };
        }
        return {
          rows: [{
            external_id: "msg-1",
            occurred_at: new Date("2026-04-29T12:00:00Z"),
            text: "private WhatsApp content"
          }]
        };
      })
    };

    const status = await buildAdminStatus(db as AdminStatusDb);

    expect(status).toEqual({
      cards: 1,
      pendingMessages: 2,
      latestRawMessage: {
        externalId: "msg-1",
        occurredAt: "2026-04-29T12:00:00.000Z"
      }
    });
    expect(JSON.stringify(status)).not.toContain("private WhatsApp content");
    expect(queries.join("\n")).not.toMatch(/\btext\b/);
  });
});
