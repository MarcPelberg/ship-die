import * as cheerio from "cheerio";
import type { LinkMetadata } from "../domain/types.js";
import { canonicalizeUrl } from "../domain/urls.js";

export function extractMetadataFromHtml(url: string, html: string): LinkMetadata {
  const $ = cheerio.load(html);
  const pick = (...selectors: string[]) => {
    for (const selector of selectors) {
      const value = $(selector).attr("content") || $(selector).text();
      if (value?.trim()) return value.trim();
    }
    return undefined;
  };

  return {
    url,
    canonicalUrl: canonicalizeUrl(url),
    title: pick('meta[property="og:title"]', "title"),
    description: pick('meta[property="og:description"]', 'meta[name="description"]'),
    siteName: pick('meta[property="og:site_name"]'),
  };
}

export async function fetchLinkMetadata(url: string, fetchImpl: typeof fetch = fetch): Promise<LinkMetadata> {
  const response = await fetchImpl(url, {
    headers: { "user-agent": "ShipDieBot/0.1 (+https://ship-die.local)" },
    redirect: "follow",
  });
  const html = await response.text();
  return extractMetadataFromHtml(response.url || url, html);
}
