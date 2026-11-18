-- Dates identify the discussion. The GSD link follows the original repository's move.
insert into cards (
  slug, discovered_at, title, summary, canonical_type, tags, source_url, source_domain, source_note, metadata
)
select slug, discussion_date::date at time zone 'UTC', title, summary, kind, tags, url, domain, label,
       jsonb_build_object('source', origin, 'curation', 'editorial', 'batch', '2026-11-18')
from (values
  ('gsd-core-spec-driven-development', '2026-04-29', 'GSD Core for spec-driven development',
   'The group shared the coding framework now maintained as GSD Core. It splits a project into planning, implementation, and verification phases. Agents work in fresh contexts and save decisions in project files that the next session can read.',
   'skill/workflow pack', array['GSD Core', 'spec-driven development', 'coding agents'],
   'https://github.com/open-gsd/gsd-core', 'github.com', 'Current GSD Core repository', 'group excerpt'),
  ('gstack-product-review-superpowers-engineering', '2026-04-29', 'Review the product idea before handing it to an engineering agent',
   'One builder used gstack to challenge a product idea and its initial plan, then switched to Superpowers for engineering. The handoff gives the implementation agent a plan whose product assumptions have already been questioned.',
   'skill/workflow pack', array['gstack', 'Superpowers', 'planning'],
   null, null, 'Group discussion', 'group excerpt'),
  ('claude-cowork-chat-delegated-tasks', '2026-09-16', 'Claude brings delegated Cowork tasks into chat',
   'Anthropic announced that a Claude conversation could handle a quick question or a longer assignment such as preparing a report. The announcement described tasks continuing after the laptop closes and a gradual rollout to Pro and Max subscribers.',
   'agent harness', array['Claude', 'Cowork', 'delegated tasks'],
   'https://x.com/claudeai/status/2100258490740539730', 'x.com', 'Claude product announcement', 'group export'),
  ('every-opus-5-5-field-review', '2026-09-22', 'Seven days with Opus 5.5 in Claude Code and Desktop',
   'Every tested Opus 5.5 on coding, design, writing, and consulting work. Several testers preferred it for coding. One planning exercise exposed a different problem. The model spent its time making training materials and missed the requested schedule.',
   'review/eval', array['Opus 5.5', 'Claude Code', 'model evaluation'],
   'https://every.to/vibe-check/vibe-check-opus-5-5-is-pulling-our-codex-converts-back-to-claude', 'every.to', 'Every field review', 'group export'),
  ('bounded-agent-code-review', '2026-09-29', 'Give automated code review a stopping point',
   'Give the reviewer the ticket, the diff, and the results of lint, type checks, and tests. A builder described allowing one fix pass for critical findings and recording the remaining suggestions as follow-up tickets. That keeps an open-ended review from expanding a scoped change.',
   'skill/workflow pack', array['code review', 'issue tracking', 'verification'],
   null, null, 'Group discussion', 'group export')
) as digest(slug, discussion_date, title, summary, kind, tags, url, domain, label, origin)
on conflict do nothing;
