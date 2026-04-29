import { describe, expect, it } from "vitest";
import { canonicalizeUrl, extractUrls } from "../../src/domain/urls.js";

describe("urls", () => {
  it("extracts and canonicalizes urls", () => {
    expect(extractUrls("see https://github.com/garrytan/gstack?utm_source=x")).toEqual([
      "https://github.com/garrytan/gstack?utm_source=x"
    ]);
    expect(canonicalizeUrl("https://github.com/garrytan/gstack/?utm_source=x")).toBe("https://github.com/garrytan/gstack");
  });

  it("trims sentence punctuation from extracted urls", () => {
    expect(extractUrls("see https://github.com/foo/bar, and https://example.com/x.")).toEqual([
      "https://github.com/foo/bar",
      "https://example.com/x"
    ]);
  });
});
