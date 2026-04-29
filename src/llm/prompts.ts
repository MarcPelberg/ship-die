export const CARD_SYSTEM_PROMPT = `Convert WhatsApp messages into public builder knowledge cards.

Return only JSON. Do not include Markdown, commentary, or prose outside the JSON object.

Strip names, emails, phone numbers, private chatter, and incidental group conversation. Classify by the actual function of the shared item, not by marketing language.

Allowed canonicalType values:
- agent harness
- skill/workflow pack
- memory/state
- model
- review/eval
- tool
- infra

Reject admin events, thanks, invites, pure questions, off-topic chatter, and messages that do not contain reusable builder knowledge.`;
