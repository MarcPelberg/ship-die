import { describe, expect, it, vi } from "vitest";
import type { Db } from "../../src/db/client.js";
import { Repositories } from "../../src/db/repositories.js";
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

  it("sanitizes public card fields before publishing", async () => {
    const provider = {
      generateCard: vi.fn().mockResolvedValue({
        title: "Alice Example alice@example.com +1 555 111 2222",
        summary: "Call Alice Example at +1 555 111 2222 or alice@example.com.",
        canonicalType: "tool",
        tags: ["Alice Example", "alice@example.com", "+1 555 111 2222"],
        sourceUrl: "https://example.com/tool",
        sourceNote: "Shared by Alice Example at alice@example.com",
        confidence: 0.9,
        shouldPublish: true
      })
    };
    const repo = { publishCard: vi.fn(), markProcessed: vi.fn(), logEvent: vi.fn() };

    const result = await processMessage({
      message: {
        externalId: "3",
        groupId: "g",
        occurredAt: new Date("2026-04-29T12:00:00Z"),
        text: "https://example.com/tool"
      },
      provider,
      repo,
      fetchMetadata: vi.fn().mockResolvedValue({
        url: "https://example.com/tool",
        canonicalUrl: "https://example.com/tool"
      })
    });

    const [publishedCard] = repo.publishCard.mock.calls[0];

    expect(result.status).toBe("published");
    expect(JSON.stringify(publishedCard)).not.toContain("Alice Example");
    expect(JSON.stringify(publishedCard)).not.toContain("alice@example.com");
    expect(JSON.stringify(publishedCard)).not.toContain("555 111 2222");
  });
});

describe("Repositories", () => {
  it("sanitizes persisted card fields and uses collision-resistant slugs", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const repo = new Repositories(db as unknown as Db);

    await repo.publishCard(
      {
        title: "Alice Example alice@example.com +1 555 111 2222",
        summary: "Call Alice Example at +1 555 111 2222 or alice@example.com.",
        canonicalType: "tool",
        tags: ["Alice Example", "alice@example.com", "+1 555 111 2222"],
        sourceUrl: "https://example.com/tool",
        sourceNote: "Shared by Alice Example at alice@example.com",
        confidence: 0.9,
        shouldPublish: true
      },
      {
        externalId: "external-message-123",
        groupId: "g",
        occurredAt: new Date("2026-04-29T12:00:00Z"),
        text: "https://example.com/tool"
      }
    );

    const params = db.query.mock.calls[0][1];
    const persistedFields = JSON.stringify(params.slice(1, 5)) + JSON.stringify(params[7]);

    expect(params[0]).toMatch(/^name-email-phone-[a-f0-9]{12}$/);
    expect(persistedFields).not.toContain("Alice Example");
    expect(persistedFields).not.toContain("alice@example.com");
    expect(persistedFields).not.toContain("555 111 2222");
  });
});
