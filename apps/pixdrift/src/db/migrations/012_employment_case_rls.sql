-- 012_employment_case_rls
-- Row-level security using a per-transaction tenant context.
--
-- Requirement: every app transaction must set:
--   set local app.tenant_id = '<tenant-uuid>'
--
-- IMPORTANT: This is intentionally strict; if the setting is missing, access is denied.

create or replace function app_current_tenant_id() returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid;
$$;

create or replace function app_require_tenant_id() returns uuid
language plpgsql
stable
as $$
declare
  tid uuid;
begin
  tid := app_current_tenant_id();
  if tid is null then
    raise exception 'tenant context missing' using errcode = '28000';
  end if;
  return tid;
end;
$$;

-- Enable RLS for tenant-scoped tables
alter table tenants enable row level security;
alter table users enable row level security;
alter table employment_cases enable row level security;
alter table case_subjects enable row level security;
alter table case_participants enable row level security;
alter table case_events enable row level security;
alter table case_facts enable row level security;
alter table evidence_items enable row level security;
alter table audit_events enable row level security;
alter table outbox_events enable row level security;

-- Tenants: allow only current tenant
drop policy if exists tenants_isolation on tenants;
create policy tenants_isolation on tenants
  using (id = app_require_tenant_id());

-- Users: allow only current tenant
drop policy if exists users_isolation on users;
create policy users_isolation on users
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

-- Employment cases
drop policy if exists employment_cases_isolation on employment_cases;
create policy employment_cases_isolation on employment_cases
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

-- Subjects / participants
drop policy if exists case_subjects_isolation on case_subjects;
create policy case_subjects_isolation on case_subjects
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_participants_isolation on case_participants;
create policy case_participants_isolation on case_participants
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

-- Events / facts / evidence
drop policy if exists case_events_isolation on case_events;
create policy case_events_isolation on case_events
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_facts_isolation on case_facts;
create policy case_facts_isolation on case_facts
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists evidence_items_isolation on evidence_items;
create policy evidence_items_isolation on evidence_items
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

-- Audit: allow tenant read; writes are still constrained
drop policy if exists audit_events_isolation on audit_events;
create policy audit_events_isolation on audit_events
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

-- Outbox: tenant read/write
drop policy if exists outbox_events_isolation on outbox_events;
create policy outbox_events_isolation on outbox_events
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

-- Restrict RLS bypass: revoke default grants (defense-in-depth)
revoke all on all tables in schema public from public;

