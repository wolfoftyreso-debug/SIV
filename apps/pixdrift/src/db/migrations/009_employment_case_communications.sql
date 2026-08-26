-- 009_employment_case_communications
-- Two-way communication records (provider-agnostic).

create table if not exists case_email_aliases (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  alias_local_part text not null,
  inbound_domain text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create unique index if not exists case_email_aliases_uidx on case_email_aliases(inbound_domain, alias_local_part);
create index if not exists case_email_aliases_tenant_case_idx on case_email_aliases(tenant_id, case_id);

create table if not exists case_communications (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  direction text not null, -- outbound|inbound|manual
  status text not null, -- draft|approved|queued|sent|received|failed
  subject text not null,
  body_text text not null,
  body_html text null,
  from_address text not null,
  to_addresses jsonb not null default '[]'::jsonb,
  cc_addresses jsonb not null default '[]'::jsonb,
  bcc_addresses jsonb not null default '[]'::jsonb,
  provider text null,
  provider_message_id text null,
  thread_key text null,
  created_by uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null
);

create index if not exists case_communications_tenant_case_idx on case_communications(tenant_id, case_id);

create table if not exists communication_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  communication_id uuid not null references case_communications(id) on delete cascade,
  event_type text not null, -- provider_accepted|delivered|bounced|reply_received|received
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists communication_events_comm_idx on communication_events(tenant_id, communication_id, occurred_at);

