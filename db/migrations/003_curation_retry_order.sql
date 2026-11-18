alter table raw_messages add column if not exists last_attempt_at timestamptz;
