const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export function stripPII(text: string): string {
  return text.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[phone]").replace(/\s{2,}/g, " ").trim();
}

export function containsPII(text: string): boolean {
  return new RegExp(EMAIL_RE).test(text) || new RegExp(PHONE_RE).test(text);
}
