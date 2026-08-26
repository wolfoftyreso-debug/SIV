-- 007_employment_case_tasks_and_deadlines

create table if not exists case_blockers (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  blocker_key text not null,
  status text not null, -- active|resolved
  message_key text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  resolved_at timestamptz null,
  resolved_by uuid null
);

create index if not exists case_blockers_tenant_case_idx on case_blockers(tenant_id, case_id);
create index if not exists case_blockers_active_idx on case_blockers(tenant_id, case_id, status);

create table if not exists case_tasks (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  title text not null,
  status text not null, -- open|done|cancelled
  due_at timestamptz null,
  created_at timestamptz not null,
  created_by uuid not null,
  completed_at timestamptz null,
  completed_by uuid null
);

create index if not exists case_tasks_tenant_case_idx on case_tasks(tenant_id, case_id);
create index if not exists case_tasks_due_idx on case_tasks(tenant_id, due_at);

create table if not exists case_deadlines (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  deadline_key text not null,
  due_date date not null,
  timezone text not null default 'Europe/Stockholm',
  computed_from jsonb not null default '{}'::jsonb,
  rule_version_ref text null,
  created_at timestamptz not null,
  created_by uuid not null,
  manual_override boolean not null default false,
  override_reason text null
);

create index if not exists case_deadlines_tenant_case_idx on case_deadlines(tenant_id, case_id);
create index if not exists case_deadlines_due_idx on case_deadlines(tenant_id, due_date);

