import { beforeAll, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../../src/db/client.js", () => ({ createDb: () => ({ query }) }));

describe("public resource links", () => {
  let app: typeof import("../../src/web/server.js").app;
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    vi.stubEnv("ADMIN_TOKEN", "test-token");
    ({ app } = await import("../../src/web/server.js"));
  });
  const row = {
    slug: "memory-note-a143", title: "Memory & state", summary: "Practical notes.", canonical_type: "memory/state",
    tags: ["agents"], source_url: null, source_note: "From the group", discovered_at: new Date("2026-05-01"),
    published_at: new Date("2026-05-07")
  };
  it("serves a summary-only note directly and supplies social preview metadata", async () => {
    query.mockResolvedValueOnce({ rows: [row] });
    const response = await app.request("/resources/memory-note-a143");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("from cards where slug = $1"), [row.slug]);
    expect(html).toContain("<h1>Memory &amp; state</h1>");
    expect(html).toContain('<meta property="og:description" content="Practical notes.">');
    expect(html).toContain('class="back-index" href="/"');
    expect(html).not.toContain("/archive.js");
  });
  it("keeps the external source reachable from the shared link", async () => {
    query.mockResolvedValueOnce({ rows: [{...row, source_url:"https://example.com/guide"}] });
    const html = await (await app.request("/resources/memory-note-a143")).text();
    expect(html).toContain('href="https://example.com/guide" rel="nofollow noreferrer">Open example.com');
  });
  it("marks a missing slug as 404 and an unavailable database as retryable", async () => {
    query.mockResolvedValueOnce({rows:[]});
    const missing = await app.request("/resources/unknown");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("Resource not found");
    query.mockRejectedValueOnce(new Error("unavailable"));
    const failed = await app.request("/resources/memory-note-a143");
    expect(failed.status).toBe(503);
    expect(await failed.text()).toContain('href="/resources/memory-note-a143">Try again');
  });
});
