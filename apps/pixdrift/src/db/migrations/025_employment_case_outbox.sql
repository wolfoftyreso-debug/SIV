-- 025_employment_case_outbox
-- Transactional outbox for async side-effects.

create table if not exists outbox_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null,
  payload_reference text not null,
  idempotency_key text not null,
  attempt integer not null default 0,
  max_attempts integer not null default 10,
  status text not null, -- queued|processing|failed|done|dead_letter
  next_attempt_at timestamptz null,
  last_error_code text null,
  correlation_id text null,
  created_at timestamptz not null default now()
);

create index if not exists outbox_status_idx on outbox_events(status, next_attempt_at);
create unique index if not exists outbox_idempotency_uidx on outbox_events(tenant_id, idempotency_key);

