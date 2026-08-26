-- 003_employment_case_events_and_facts

do $$ begin
  create type fact_status as enum (
    'proposed',
    'alleged',
    'corroborated',
    'accepted',
    'disputed',
    'withdrawn',
    'inconclusive'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists case_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,

  event_type text not null,
  title text not null,
  description text not null,
  occurred_at timestamptz null,
  occurred_date_precision text not null,
  employer_knowledge_at timestamptz null,
  location text null,
  source_type text not null,
  source_actor_id uuid null,
  verification_status text not null,
  disputed_status text not null,
  confidentiality_level data_classification not null,
  created_by uuid not null,
  created_at timestamptz not null,
  version integer not null
);

create index if not exists case_events_tenant_case_idx on case_events(tenant_id, case_id);
create index if not exists case_events_created_at_idx on case_events(tenant_id, case_id, created_at);

create table if not exists case_facts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  key text not null,
  value jsonb not null,
  value_type text not null,
  status fact_status not null,
  confidence_source text not null,
  source_references jsonb not null default '[]'::jsonb,
  effective_from timestamptz null,
  effective_to timestamptz null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  created_at timestamptz not null,
  supersedes_fact_id uuid null
);

create index if not exists case_facts_tenant_case_idx on case_facts(tenant_id, case_id);
create index if not exists case_facts_key_idx on case_facts(tenant_id, case_id, key);

