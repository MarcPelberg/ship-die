import { describe, expect, it } from "vitest";
import { extractMetadataFromHtml, fetchLinkMetadata } from "../../src/metadata/fetch.js";

describe("extractMetadataFromHtml", () => {
  it("uses Open Graph metadata when available", () => {
    const meta = extractMetadataFromHtml(
      "https://github.com/x/y",
      `
      <html><head>
        <meta property="og:title" content="Useful Repo">
        <meta property="og:description" content="Does useful agent work">
        <meta property="og:site_name" content="GitHub">
      </head></html>
    `,
    );

    expect(meta).toEqual({
      url: "https://github.com/x/y",
      canonicalUrl: "https://github.com/x/y",
      title: "Useful Repo",
      description: "Does useful agent work",
      siteName: "GitHub",
    });
  });
});

describe("fetchLinkMetadata", () => {
  it("throws for non-OK HTTP responses", async () => {
    const fetchImpl: typeof fetch = async () =>
      ({
        ok: false,
        status: 404,
        url: "https://example.test/missing",
        text: async () => "<html><head><title>Missing</title></head></html>",
      }) as Response;

    await expect(fetchLinkMetadata("https://example.test/missing", fetchImpl)).rejects.toThrow(
      "Failed to fetch metadata (404) for https://example.test/missing",
    );
  });
});
