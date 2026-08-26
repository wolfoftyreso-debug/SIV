-- 002_employment_case_participants
-- Minimal participant scaffolding for first vertical slice.

create table if not exists case_subjects (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  external_ref text null,
  display_name text not null,
  synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists case_subjects_tenant_idx on case_subjects(tenant_id);

create table if not exists case_participants (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  participant_type text not null, -- employee|manager|colleague|external_counsel|other
  user_id uuid null references users(id) on delete set null,
  subject_id uuid null references case_subjects(id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists case_participants_tenant_case_idx on case_participants(tenant_id, case_id);

