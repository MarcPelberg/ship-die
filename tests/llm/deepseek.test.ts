import { describe, expect, it } from "vitest";
import { parseDeepSeekCardDraft } from "../../src/llm/deepseek.js";

describe("parseDeepSeekCardDraft", () => {
  it("normalizes canonical type and tags", () => {
    const draft = parseDeepSeekCardDraft(
      JSON.stringify({
        title: "Claude Octopus",
        summary: "Multi-model review for coding tasks.",
        canonicalType: "review/eval",
        tags: ["Debugging", "multi-model", "debugging"],
        sourceUrl: "https://github.com/nyldn/claude-octopus",
        sourceNote: "github repo",
        confidence: 0.91,
        shouldPublish: true
      })
    );

    expect(draft.canonicalType).toBe("review/eval");
    expect(draft.tags).toEqual(["debugging", "multi-model"]);
    expect(draft.shouldPublish).toBe(true);
  });
});
