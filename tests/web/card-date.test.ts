import { describe, expect, it } from "vitest";

describe("card dates", () => {
  it("uses the WhatsApp post time as the public card date", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
    process.env.ADMIN_TOKEN = "secret-token";

    const { toPublicCard } = await import("../../src/web/server.js");

    const card = toPublicCard({
      title: "Harness Notes",
      summary: "Native local harness notes.",
      canonical_type: "agent harness",
      tags: ["codex"],
      source_url: null,
      source_note: "curated from group",
      discovered_at: new Date("2026-05-07T18:30:00Z"),
      published_at: new Date("2026-05-08T05:00:00Z")
    });

    expect(card.publishedAt.toISOString()).toBe("2026-05-07T18:30:00.000Z");
  });
});
