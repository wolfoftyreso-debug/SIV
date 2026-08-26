-- 027_webhook_events
-- Idempotency store for provider webhooks (dedupe + replay protection).

create table if not exists webhook_events (
  id uuid primary key,
  tenant_id uuid null references tenants(id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  received_at timestamptz not null default now(),
  event_type text not null,
  payload_hash text not null
);

create unique index if not exists webhook_events_provider_event_uidx on webhook_events(provider, external_event_id);
create index if not exists webhook_events_received_idx on webhook_events(received_at);

alter table webhook_events enable row level security;

-- Webhooks may not resolve tenant at ingress; allow reads/writes for current tenant only when tenant_id is set.
drop policy if exists webhook_events_isolation on webhook_events;
create policy webhook_events_isolation on webhook_events
  using (tenant_id is null or tenant_id = app_require_tenant_id())
  with check (tenant_id is null or tenant_id = app_require_tenant_id());

grant select, insert, update, delete on webhook_events to pixdrift_app;

