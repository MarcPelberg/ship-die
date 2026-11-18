-- Primary sources for named tools in the November editorial digest.
update cards as c
set source_url = links.url, source_domain = links.domain, source_note = links.label
from (values
  ('t3-code-multiple-harnesses', 'https://github.com/pingdotgg/t3code', 'github.com', 'T3 Code repository'),
  ('claude-code-parallel-worktrees', 'https://code.claude.com/docs/en/remote-control', 'code.claude.com', 'Remote Control documentation')
) as links(slug, url, domain, label)
where c.slug = links.slug and c.source_url is null
  and not exists (select 1 from cards prior where prior.source_url = links.url);
