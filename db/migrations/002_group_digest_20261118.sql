-- Public editorial summaries. Dates identify the discussion, at day precision.
insert into cards (
  slug, discovered_at, title, summary, canonical_type, tags, source_note, metadata
)
select slug, discussion_date::date at time zone 'UTC', title, summary, kind, tags,
       'Group discussion', '{"source":"group export","curation":"editorial","batch":"2026-11-18"}'::jsonb
from (values
  ('claude-code-parallel-worktrees', '2026-09-17', 'Separate parallel Claude Code sessions with worktrees',
   'The group discussed using Remote Control to start several coding sessions from Claude Desktop. Give sessions their own Git worktrees when they need to edit the same repository independently.',
   'agent harness', array['Claude Code', 'Git worktrees', 'parallel sessions']),
  ('assistant-permissions-subscription-review', '2026-09-22', 'Separate finding subscriptions from canceling them',
   'A discussion about assistants reviewing recurring charges raised a practical permissions question. Reading transactions, recommending a cancellation, and acting on an account each require a different level of access.',
   'skill/workflow pack', array['permissions', 'assistants']),
  ('call-reason-classification', '2026-09-28', 'Frame call-reason classification as a choice',
   'For a call-routing experiment, the group suggested giving the classifier a fixed set of possible reasons. That makes competing models easier to compare on the same calls. The discussion did not report a winning model.',
   'review/eval', array['classification', 'evaluation']),
  ('coding-ticket-cross-model-review', '2026-09-29', 'Have a second model challenge the implementation plan',
   'Write a ticket with testable acceptance criteria, affected files, and explicit exclusions. Ask a model from another family to look for gaps and simpler approaches before handing the revised plan to an implementation agent.',
   'skill/workflow pack', array['code review', 'planning', 'acceptance criteria']),
  ('scheduled-agent-missed-runs', '2026-10-06', 'Alert when a scheduled agent misses its deadline',
   'A dashboard built from completed runs can look healthy after a job stops running. Record the expected schedule independently, check for a completed run at the deadline, and send one daily report of exceptions.',
   'infra', array['scheduled agents', 'monitoring', 'alerts']),
  ('scheduled-agent-output-quality', '2026-10-06', 'Measure what a scheduled agent actually processed',
   'Compare incoming work with completed work. For an inbox, count messages received and handled. For a matching job, inspect a small sample of decisions. Both checks can catch failures that a successful exit code misses.',
   'review/eval', array['scheduled agents', 'quality checks']),
  ('plan-and-implementation-models', '2026-11-15', 'Evaluate planning and implementation separately',
   'Builders reported different preferences for writing plans and executing them. One workflow used a reasoning model to settle open questions, then handed a bounded implementation task to a faster coding model.',
   'model', array['model selection', 'planning', 'coding']),
  ('agent-issue-records', '2026-11-16', 'Keep agent handoffs and verification on the issue',
   'Teams compared ticket-based coding workflows. Recording the implementation plan, review findings, and verification results on the issue gives the next agent a place to recover the reasons behind a change.',
   'memory/state', array['issue tracking', 'agent handoffs', 'verification']),
  ('t3-code-multiple-harnesses', '2026-11-16', 'T3 Code for working across coding harnesses',
   'A builder described using T3 Code to organize work across several coding harnesses and delegate subtasks between them. The discussion offered it as an option for people who already switch between coding apps.',
   'agent harness', array['T3 Code', 'coding agents'])
) as digest(slug, discussion_date, title, summary, kind, tags)
on conflict (slug) do nothing;
