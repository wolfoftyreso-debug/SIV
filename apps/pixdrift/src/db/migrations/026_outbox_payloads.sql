-- 026_outbox_payloads
-- Store outbox payload JSON separately to avoid large/PII payloads in queue metadata.

create table if not exists outbox_payloads (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists outbox_payloads_tenant_idx on outbox_payloads(tenant_id, created_at);

alter table outbox_payloads enable row level security;
drop policy if exists outbox_payloads_isolation on outbox_payloads;
create policy outbox_payloads_isolation on outbox_payloads
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

grant select, insert, update, delete on outbox_payloads to pixdrift_app;

