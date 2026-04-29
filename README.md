# Ship != Die

Public, searchable archive of useful builder drops from the `/ship! = die development` WhatsApp group.

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
