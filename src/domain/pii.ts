const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function stripPII(text: string): string {
  return text
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, (match) => (ISO_DATE_RE.test(match) ? match : "[phone]"))
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function containsPII(text: string): boolean {
  return new RegExp(EMAIL_RE).test(text) || [...text.matchAll(PHONE_RE)].some(([match]) => !ISO_DATE_RE.test(match));
}
