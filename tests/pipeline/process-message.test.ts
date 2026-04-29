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
