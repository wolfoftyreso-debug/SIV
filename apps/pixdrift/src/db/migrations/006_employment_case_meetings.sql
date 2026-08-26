-- 006_employment_case_meetings

create table if not exists case_meetings (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  meeting_type text not null,
  title text not null,
  purpose text not null,
  scheduled_at timestamptz not null,
  location text null,
  status text not null, -- scheduled|completed|cancelled
  created_by uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null
);

create index if not exists case_meetings_tenant_case_idx on case_meetings(tenant_id, case_id);

create table if not exists meeting_participants (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  meeting_id uuid not null references case_meetings(id) on delete cascade,
  participant_name text not null,
  participant_email text null,
  role text not null, -- employee|manager|union_rep|support_person|other
  created_at timestamptz not null default now()
);

create index if not exists meeting_participants_meeting_idx on meeting_participants(tenant_id, meeting_id);

