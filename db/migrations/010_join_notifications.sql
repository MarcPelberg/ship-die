-- Capture only new applications. A historical row keeps its NULL due date.
alter table group_join_requests
  add column notification_due_at timestamptz,
  add column notification_sent_at timestamptz,
  add column notification_attempts integer not null default 0;

alter table group_join_requests alter column notification_due_at set default now();

create index group_join_notification_due_idx
  on group_join_requests (notification_due_at, id) where notification_due_at is not null;
