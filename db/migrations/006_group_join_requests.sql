create table group_join_requests (
  id bigint generated always as identity primary key,
  submitted_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 100),
  whatsapp_phone text not null unique check (whatsapp_phone ~ '^[+][1-9][0-9]{6,14}$'),
  background text not null check (length(background) between 10 and 1000)
);
