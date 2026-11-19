# Ship != Die

Public, searchable archive of useful builder drops from the `/ship! = die development` WhatsApp group.

Browse the archive at [aishipdie.com](https://aishipdie.com/). Links using `www.aishipdie.com` or the previous `shipdie.marcpelberg.com` address redirect to the same entry or search on the new domain.

### Historical coverage checked on November 18, 2026

The November 18 WhatsApp ZIP starts with the group's April 29 creation notice and ends on November 18. It contains **281 dated entries on 36 days**, including system notices, plus seven images and one Markdown attachment. All 97 entries in the earlier September–November exports match entries in the ZIP. The original April and May excerpts also match its substantive discussions and shared links.

| 2026 | Dated entries |
| --- | ---: |
| April | 92 |
| May | 27 |
| June | 2 |
| July | 13 |
| August | 0 |
| September | 109 |
| October | 11 |
| November through the 18th | 27 |

The ZIP supplies 69 entries on 14 dates between May 8 and September 15. Neither source shows a post between October 15 and November 8. The longest interval without a dated entry is July 17 through September 1. One November 18 entry records a deleted message, whose contents are unavailable. Dates use the local calendar shown in the export.

The public archive presents selected tools, methods, and resources from these discussions. The transcript and original attachments remain private.

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run ingest:fixture -- fixtures/sample-chat.json
npm run worker
npm run dev
```

Open `http://localhost:3000`.

`npm run worker` calls DeepSeek, so set `DEEPSEEK_API_KEY` in `.env` before running it.

## Privacy

Raw WhatsApp data, member names, phone numbers, emails, API keys, and WhatsApp session files must never be committed. Public cards are cleaned summaries only.

## Reader

Use the dedicated Mexican WhatsApp account. Do not use the user's personal account unless live ingestion is blocked and the user explicitly chooses that fallback.

## Deployment

OVH deployment notes are in `docs/deploy/ovh.md`.
