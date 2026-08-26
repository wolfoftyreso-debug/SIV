-- 010_employment_case_audit
-- Append-only audit log with hash chaining.

create table if not exists audit_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid null,
  actor_id uuid not null,
  operation text not null,
  resource_type text not null,
  resource_id text not null,
  occurred_at timestamptz not null,
  correlation_id text null,
  session_id text null,
  result text not null,
  reason text null,
  previous_hash text null,
  event_hash text not null,
  hash_version integer not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_events_tenant_idx on audit_events(tenant_id, occurred_at);
create index if not exists audit_events_case_idx on audit_events(tenant_id, case_id, occurred_at);

