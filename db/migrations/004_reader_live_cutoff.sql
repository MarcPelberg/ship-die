-- Keep delivered history available for reconciliation without queueing old posts again.
alter table raw_messages add column if not exists held_for_reconciliation boolean not null default false;
insert into system_state (key, value)
values ('whatsapp_reader_live_from', to_jsonb(clock_timestamp()))
on conflict (key) do nothing;
