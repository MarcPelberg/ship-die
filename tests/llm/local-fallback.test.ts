import { describe, expect, it } from "vitest";
import { LocalFallbackProvider } from "../../src/llm/local-fallback.js";

describe("LocalFallbackProvider", () => {
  it("builds a publishable card without external model credentials", async () => {
    const provider = new LocalFallbackProvider();
    const card = await provider.generateCard({
      message: {
        externalId: "m1",
        groupId: "g1",
        occurredAt: new Date("2026-04-29T00:00:00Z"),
        text: "Check this workflow pack https://github.com/obra/superpowers"
      },
      cleanedText: "Check this workflow pack https://github.com/obra/superpowers",
      links: [
        {
          url: "https://github.com/obra/superpowers",
          canonicalUrl: "https://github.com/obra/superpowers",
          title: "obra/superpowers"
        }
      ]
    });

    expect(card.shouldPublish).toBe(true);
    expect(card.sourceUrl).toBe("https://github.com/obra/superpowers");
    expect(card.canonicalType).toBe("skill/workflow pack");
    expect(card.confidence).toBeGreaterThanOrEqual(0.68);
  });
});

