# Ship != Die Design

## Goal

Build a public, no-fluff knowledge site that turns the `/ship! = die development` WhatsApp group into a searchable archive of useful builder drops.

The site should not be a raw chat dump. It should automatically ingest group messages, identify valuable coding/LLM/building information, strip personal data, merge duplicates, classify by function, and publish clean cards with minimal manual involvement.

## Product Shape

The public site is a raw but polished archive:

- Plain header with `Ship != Die`.
- Search bar at the top.
- Topic filters below search.
- Compact status strip for trust signals.
- Main content as a dense chronological list of cleaned knowledge cards.
- No hero section, marketing copy, community theatre, or heavy dashboard.

Each public card includes:

- Title.
- Short practical summary.
- Canonical type.
- Supporting tags.
- Source link when available.
- Published date or discovered date.
- Minimal source note such as `from group, cleaned` or `duplicate merged`.

The public site never exposes raw WhatsApp messages, names, phone numbers, emails, or the complete member list.

## Ingestion

Use the dedicated Mexican WhatsApp account as the reader. Invite that account into the group and keep it logged in as a linked device. The user's personal WhatsApp account should be treated only as an emergency fallback.

The ingestion layer should be adapter-based because unofficial WhatsApp automation is brittle. The first implementation can use a WhatsApp Web-compatible library or automation approach, but the rest of the system should depend on an internal interface, not directly on one vendor/library.

The reader watches only the configured group and stores raw messages privately for processing and traceability. The private store is not committed to the public repository.

Fallback ingestion should be possible through exported chat files or forwarded messages if live automation breaks.

## Publishing Pipeline

The pipeline runs automatically. There is no manual approval queue for normal operation.

For each incoming message or message cluster:

1. Ignore non-content events such as joins, deletes, group description changes, reactions, thanks, and admin noise.
2. Extract links, titles, previews, and adjacent context.
3. Fetch public link metadata when available, especially GitHub title, description, README summary, stars/license if cheaply available, and canonical URL.
4. Decide whether the item is valuable enough to publish.
5. Strip names, phone numbers, emails, and other personal identifiers.
6. Merge duplicate links or repeated mentions into one canonical card.
7. Generate a title, summary, canonical type, tags, and source note.
8. Publish the card automatically if confidence and safety checks pass.

Messages with no durable value are kept out of the public site. Examples include pure questions, acknowledgments, reactions, invitations, and off-topic chatter. A message with no link can still publish if it contains a useful claim, comparison, workflow, or field report.

## Classification

The chat's wording is evidence, not authority. If a sender calls something a framework, skill, harness, or tool, the classifier must still determine what it actually does.

Public cards have one canonical type plus optional tags.

Initial canonical types:

- `agent harness`: systems that orchestrate agents, coordinate multi-agent work, or wrap coding-agent execution.
- `skill/workflow pack`: reusable agent procedures, command packs, setup bundles, or role-based workflows.
- `memory/state`: tools that add persistence, memory, project context, or state management to agents.
- `model`: model comparisons, model capability claims, model routing, or provider notes.
- `review/eval`: tools or methods for testing, reviewing, comparing, or validating outputs before shipping.
- `tool`: useful standalone developer tools that do not fit the more specific categories.
- `infra`: deployment, hosting, CI, observability, database, security, or cost-control notes.

The classifier should use the best available evidence:

- Message content.
- Link preview title and description.
- GitHub repository metadata.
- README summary when available.
- Nearby follow-up messages.
- Historical duplicate mentions.

Examples from the sample chat:

- `gastownhall/beads`: `memory/state`, with tags like `coding agents`, `github repo`.
- `obra/superpowers`: `skill/workflow pack`, with tags like `codex`, `claude code`.
- GPT 5.5 vs Opus comments: `model`, with tags like `comparison`, `coding quality`.
- `garrytan/gstack`: `skill/workflow pack`, with tags like `claude code`, `setup`.
- `nyldn/claude-octopus`: `review/eval`, with tags like `multi-model`, `debugging`.

Low-confidence classification should be recorded internally for debugging, but the public UI should stay clean.

## Search And Browsing

Use Postgres full-text search for v1. It is enough until the archive is large enough to justify embeddings.

Search should cover:

- Card title.
- Summary.
- Canonical type.
- Tags.
- Source URL/domain.
- Link metadata.

Topic filters use canonical types first. Tags provide secondary discovery.

Semantic/vector search can be added later without changing the public product shape.

## Admin And Operations

No heavy admin CMS is needed.

Include a minimal hidden status page or protected endpoint showing:

- Reader online/offline.
- Last message seen.
- Last card published.
- Number of messages rejected as noise.
- Duplicate merges.
- Current processing errors.
- LLM/provider health.

This page is for debugging, not editorial workflow.

## Data Privacy

Raw WhatsApp data is private production data and must not be published or committed.

The public repo contains:

- Application code.
- Deployment docs.
- Schema/migration files.
- Example anonymized fixtures.
- Classifier prompts/configuration without secrets.

The public repo does not contain:

- Raw WhatsApp exports.
- Phone numbers.
- Emails.
- Member names.
- API keys.
- WhatsApp session files.
- Production database dumps.

The processing pipeline strips personal information before publication. Source links can remain if they are public URLs.

## Infrastructure

Deploy everything on OVH.

Recommended v1 stack:

- OVH VPS.
- Docker Compose.
- Reverse proxy with automatic TLS.
- App server.
- Background worker.
- WhatsApp reader service.
- Postgres.
- Scheduled backups.
- Healthcheck route and smoke test.

Use DeepSeek as the initial LLM provider. Keep the provider interface swappable so another provider can be used later without changing the publishing pipeline.

Use a provider interface for:

- Value filtering.
- PII cleanup.
- Card generation.
- Classification.
- Optional link summarization.

The initial DeepSeek integration should use DeepSeek's OpenAI-compatible API at `https://api.deepseek.com` with current model names from the official docs. As of April 29, 2026, DeepSeek lists `deepseek-v4-flash` and `deepseek-v4-pro`, while older `deepseek-chat` and `deepseek-reasoner` names are compatibility aliases scheduled for future deprecation. Use structured JSON output for classifier/card generation where possible, and validate the JSON before publishing.

## Reliability Risks

The biggest risk is WhatsApp ingestion. Unofficial WhatsApp Web automation can break or flag accounts. Keeping ingestion behind an adapter and using a dedicated WhatsApp account reduces blast radius.

The second risk is automatic publishing quality. The pipeline needs conservative filtering, duplicate detection, and PII stripping before publishing. Since there is no manual approval step, the system should prefer not publishing over publishing junk or sensitive data.

The third risk is classification drift. Canonical types should be stored in config and reviewed through logs/status, but the public site should not expose uncertainty.

## Success Criteria

The first working version is successful when:

- The reader can ingest messages from the target WhatsApp group.
- Noise messages are rejected automatically.
- Useful drops become public cards without manual approval.
- Names, phone numbers, and emails are stripped from public output.
- Duplicate links merge into one card.
- Cards can be searched by text and filtered by canonical type.
- The site runs on OVH with basic health checks and backups.
- The code can live in a public repository without leaking private data.

## Deferred

These are intentionally not v1:

- Full CMS/editorial workflow.
- User accounts.
- Comments or voting.
- Newsletter.
- Embedding/semantic search unless Postgres search is insufficient.
- Public raw chat archive.
- Fine-grained member attribution.
