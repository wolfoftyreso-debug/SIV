-- 001_employment_cases_core
-- Core entities: tenants, users, employment_cases

create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

do $$ begin
  create type data_classification as enum (
    'public',
    'internal',
    'confidential',
    'highly_confidential',
    'special_category',
    'criminal_allegation'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type case_status as enum (
    'draft',
    'active',
    'awaiting_employer_input',
    'awaiting_employee_response',
    'awaiting_external_response',
    'awaiting_review',
    'paused',
    'blocked',
    'escalated',
    'resolved',
    'closed',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type case_phase as enum (
    'intake',
    'employment_context',
    'initial_assessment',
    'fact_finding',
    'employee_dialogue',
    'corrective_action',
    'rehabilitation_assessment',
    'work_adjustment',
    'follow_up',
    'reassignment_assessment',
    'union_process',
    'formal_notice',
    'formal_decision',
    'exit_execution',
    'dispute_management',
    'resolution',
    'closure'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists tenants (
  id uuid primary key,
  name text not null,
  synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists tenants_name_uidx on tenants (name);

create table if not exists users (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  display_name text not null,
  roles jsonb not null default '[]'::jsonb,
  synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_tenant_idx on users(tenant_id);
create unique index if not exists users_tenant_email_uidx on users(tenant_id, email);

create table if not exists employment_cases (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  external_case_number varchar(32) not null,
  title text not null,
  description text not null,
  status case_status not null,
  phase case_phase not null,
  confidentiality_level data_classification not null,
  active_tracks jsonb not null default '[]'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null
);

create index if not exists employment_cases_tenant_idx on employment_cases(tenant_id);
create index if not exists employment_cases_status_idx on employment_cases(tenant_id, status);
create index if not exists employment_cases_created_at_idx on employment_cases(tenant_id, created_at);
create unique index if not exists employment_cases_external_number_uidx on employment_cases(tenant_id, external_case_number);

