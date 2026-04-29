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
