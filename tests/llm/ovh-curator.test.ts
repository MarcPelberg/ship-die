import { afterEach, describe, expect, it, vi } from "vitest";
import { OvhCurator, publicRepository } from "../../src/llm/ovh-curator.js";

afterEach(() => vi.unstubAllGlobals());

describe("OVH curator", () => {
  it("looks up repository metadata only through the public GitHub API", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ private: false, full_name: "org/repo" }));
    expect((await publicRepository("https://example.org/private", request)).canonicalUrl).toBe("");
    expect(request).not.toHaveBeenCalled();
    expect((await publicRepository("https://github.com/org/repo?contact=private", request)).canonicalUrl).toBe("https://github.com/org/repo");
    expect(request.mock.calls[0][0]).toBe("https://api.github.com/repos/org/repo");
    request.mockResolvedValue(Response.json({ private: true }));
    expect((await publicRepository("https://github.com/org/repo", request)).canonicalUrl).toBe("");
  });

  it("rejects copied chat and never gives identifiers or private links to the model", async () => {
    const sentence = "Use one fresh working directory for every independent coding task";
    const request = vi.fn().mockResolvedValue(Response.json({ message: { content: JSON.stringify({
      publish: true, title: "Separate worktrees", summary: sentence, category: "tool", tags: []
    }) } }));
    vi.stubGlobal("fetch", request);
    const card = await new OvhCurator("test").generateCard({
      message: { externalId: "private-id", groupId: "private-group", occurredAt: new Date(), text: sentence },
      cleanedText: sentence + " https://example.org/private-url",
      links: [{ url: "https://example.org/private-url", canonicalUrl: "https://example.org/private-url" }]
    });
    expect(card.shouldPublish).toBe(false);
    expect(request.mock.calls[0][0]).toBe("http://curator:11434/api/chat");
    expect(request.mock.calls[0][1].body).not.toMatch(/private-id|private-url|private-group/);
  });
});
