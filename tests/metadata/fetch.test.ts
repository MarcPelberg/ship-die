import { describe, expect, it } from "vitest";
import { extractMetadataFromHtml } from "../../src/metadata/fetch.js";

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
