const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const DATE_LIKE_RE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2})?$/;

function isDateLikeCandidate(text: string): boolean {
  return DATE_LIKE_RE.test(text);
}

function protectUrls(text: string): { protectedText: string; urls: string[] } {
  const urls: string[] = [];
  const protectedText = text.replace(URL_RE, (url) => {
    const index = urls.push(url) - 1;
    return `__PII_URL_${index}__`;
  });

  return { protectedText, urls };
}

function restoreUrls(text: string, urls: string[]): string {
  return text.replace(/__PII_URL_(\d+)__/g, (_match, index: string) => urls[Number(index)] ?? _match);
}

export function stripPII(text: string): string {
  const { protectedText, urls } = protectUrls(text);
  const cleaned = protectedText
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, (match) => (isDateLikeCandidate(match) ? match : "[phone]"))
    .replace(/\s{2,}/g, " ")
    .trim();

  return restoreUrls(cleaned, urls);
}

export function containsPII(text: string): boolean {
  const { protectedText } = protectUrls(text);

  return new RegExp(EMAIL_RE).test(protectedText) || [...protectedText.matchAll(PHONE_RE)].some(([match]) => !isDateLikeCandidate(match));
}
