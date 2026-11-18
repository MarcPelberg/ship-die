import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/web/render.js";

describe("renderHome", () => {
  it("links the resource title and exposes readable topic labels and searchable tags", () => {
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
    expect(html).toContain("Memory &amp; state");
    expect(html).toContain('href="/?type=memory%2Fstate"');
    expect(html).toContain('href="/?q=coding+agents"');
    expect(html).toContain('<a href="https://github.com/gastownhall/beads"');
  });

  it("keeps the active query on topic links and offers recovery from empty searches", () => {
    const html = renderHome({ query: "<wiring>", type: "model", cards: [] });
    expect(html).toContain('href="/?q=%3Cwiring%3E&amp;type=model" aria-current="page"');
    expect(html).toContain("No matching resources");
    expect(html).toContain("Browse all resources");
    expect(html).not.toContain("<wiring>");
    expect(renderHome({ query: "", type: "", cards: [] })).toContain("No resources yet");
  });

  it("retains search and page when retrying a temporary backend failure", () => {
    const html = renderHome({ query: "memory", type: "", page: 2, cards: [], unavailable: true });
    expect(html).toContain('href="/?q=memory&amp;page=2">Try again');
    expect(html).not.toContain("No matching resources");
  });
});
