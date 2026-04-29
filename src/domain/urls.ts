const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const TRACKING_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]);

export function extractUrls(text: string): string[] {
  return [...new Set(text.match(URL_RE) ?? [])];
}

export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const param of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) url.searchParams.delete(param);
  }
  url.hash = "";
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  url.pathname = pathname;
  return url.toString().replace(/\?$/, "");
}

export function domainFromUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  return new URL(rawUrl).hostname.replace(/^www\./, "");
}
