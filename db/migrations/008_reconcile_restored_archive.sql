-- These thirteen cards originally lived only in a database backup. Keep their public
-- URLs and IDs on the restored site and reproduce them on a new installation.
insert into cards (
  slug, discovered_at, title, summary, canonical_type, tags, source_url, source_domain, source_note, metadata
)
select slug, day::date at time zone 'UTC', title, summary, kind, tags, url, domain, note,
       '{"source":"group export","curation":"editorial","batch":"2026-11-18-full-export"}'::jsonb
from (values
  ('beads-memory-upgrade', '2026-04-29', 'Beads',
   'Beads gives coding agents a persistent issue tracker. A later session can recover open work and its dependencies from the project instead of reconstructing them from chat.',
   'memory/state', array['agent memory', 'issue tracking', 'coding agents'], 'https://github.com/gastownhall/beads', 'github.com', 'Beads repository'),
  ('claude-octopus-multi-model-review', '2026-04-29', 'Claude Octopus',
   'Claude Octopus runs several models on the same task. The group discussed using their disagreements to find blind spots during code review and debugging.',
   'review/eval', array['multi-model', 'Claude Code', 'review', 'debugging'], 'https://github.com/nyldn/claude-octopus', 'github.com', 'Claude Octopus repository'),
  ('gpt-5-5-coding-model-note', '2026-04-29', 'Early coding impressions of GPT-5.5',
   'Builders compared their experience coding with GPT-5.5 and Claude Opus 4.6 and 4.7. The discussion records individual preferences and supplies no common benchmark.',
   'model', array['GPT-5.5', 'Opus', 'coding', 'model comparison'], null, null, 'Group discussion'),
  ('gstack-claude-code-setup', '2026-04-29', 'gstack',
   'gstack packages different roles for a Claude Code project. A team can use separate tools for product review, engineering planning, design, release preparation, documentation, and QA.',
   'skill/workflow pack', array['Claude Code', 'planning', 'QA'], 'https://github.com/garrytan/gstack', 'github.com', 'gstack repository'),
  ('paperclipai-paperclip', '2026-04-29', 'Paperclip',
   'The group shared Paperclip while comparing tools for building with agents. Its public project organizes agents and their assigned work in one place.',
   'agent harness', array['agent management', 'coding agents'], 'https://github.com/paperclipai/paperclip', 'github.com', 'Paperclip repository'),
  ('superpowers-skill-system', '2026-04-29', 'Superpowers',
   'Superpowers gives coding agents reusable workflows for planning, implementation, and review. The group discussed it as a way to carry the same engineering practices between sessions.',
   'skill/workflow pack', array['skills', 'agent workflow', 'Claude Code', 'Codex'], 'https://github.com/obra/superpowers', 'github.com', 'Superpowers repository'),
  ('kimi-agent-swarm-for-benchmarked-workflows', '2026-04-29', 'Compare a Kimi agent swarm with a human baseline',
   'A builder proposed running agents on tasks that usually need human intervention. Record failures, cost, and final outcomes, then compare them with the same work performed by a person.',
   'agent harness', array['Kimi', 'agent swarm', 'benchmarking'], null, null, 'Group discussion'),
  ('native-local-harness-setup-notes', '2026-04-29', 'Compare the local and cloud coding environments',
   'One builder reported better results running Codex locally for their workflow and preferred the terminal for Claude. When evaluating a model, record which application and execution environment handled the task.',
   'agent harness', array['Codex', 'Claude', 'local development', 'terminal'], null, null, 'Group discussion'),
  ('llm-serving-efficiency-patterns', '2026-04-29', 'Where inference servers spend time and memory',
   'A shared video prompted a discussion of continuous batching, separating prompt processing from token generation, managing the key-value cache, and routing requests with shared prefixes. Each addresses a different cost of serving a model.',
   'infra', array['model serving', 'continuous batching', 'KV cache', 'prefix routing'], 'https://www.facebook.com/reel/1232401865443968', 'www.facebook.com', 'Shared video on inference optimization'),
  ('continuous-learning-plan-generator', '2026-05-07', 'Build a learning plan that can be updated',
   'A builder described using search to collect videos and references for a learning wiki. A coordinating model organizes the material, and a stronger model combines the results at the end, limiting the cost of routine searches.',
   'skill/workflow pack', array['learning plan', 'Tavily', 'research', 'cost control'], null, null, 'Group discussion'),
  ('knowledge-base-drift-pr-agents', '2026-05-07', 'Propose knowledge-base corrections as pull requests',
   'An agent can watch for changes that make a project wiki or skill file stale. Have it propose a specific edit in a pull request so a maintainer can check the new information before it becomes shared context.',
   'skill/workflow pack', array['knowledge base', 'drift detection', 'pull requests'], null, null, 'Group discussion'),
  ('llm-os-mcp-wiki-knowledge-base', '2026-05-07', 'Expose a project wiki through MCP',
   'A builder kept a business wiki in its own repository and made it accessible to agents through MCP. A companion skill explained how to use the wiki, so multiple workflows could consult the same maintained material.',
   'memory/state', array['MCP', 'wiki', 'knowledge base', 'skills'], null, null, 'Group discussion'),
  ('tavily-research-search-layer', '2026-05-07', 'Tavily for the first pass of research',
   'The group discussed Tavily as the first search step when building a research wiki or learning plan. A builder also used search inside the model application when the first pass needed more context.',
   'tool', array['Tavily', 'search', 'research', 'learning plans'], 'https://www.tavily.com/', 'www.tavily.com', 'Tavily website')
) as digest(slug, day, title, summary, kind, tags, url, domain, note)
on conflict (slug) do update set
  discovered_at = excluded.discovered_at, title = excluded.title, summary = excluded.summary,
  canonical_type = excluded.canonical_type, tags = excluded.tags, source_url = excluded.source_url,
  source_domain = excluded.source_domain, source_note = excluded.source_note, metadata = cards.metadata || excluded.metadata;
