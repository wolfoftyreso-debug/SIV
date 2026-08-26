-- 008_employment_case_documents
-- Minimal, versioned documents and templates for the first vertical slice.

create table if not exists document_templates (
  id uuid primary key,
  key text not null,
  title text not null,
  status text not null, -- draft|in_review|published|superseded
  not_legally_reviewed boolean not null default true,
  synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists document_templates_key_uidx on document_templates(key);

create table if not exists document_template_versions (
  id uuid primary key,
  template_id uuid not null references document_templates(id) on delete cascade,
  version integer not null,
  content jsonb not null,
  status text not null, -- draft|published|superseded
  created_at timestamptz not null default now()
);

create unique index if not exists document_template_versions_uidx on document_template_versions(template_id, version);

create table if not exists case_documents (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  template_key text not null,
  status text not null, -- draft|generated|under_review|approved|finalized|delivered|archived
  created_by uuid not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null
);

create index if not exists case_documents_tenant_case_idx on case_documents(tenant_id, case_id);

create table if not exists case_document_versions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  document_id uuid not null references case_documents(id) on delete cascade,
  version integer not null,
  html text not null,
  pdf_blob_path text null,
  created_by uuid not null,
  created_at timestamptz not null
);

create unique index if not exists case_document_versions_uidx on case_document_versions(document_id, version);

create table if not exists document_approvals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  document_id uuid not null references case_documents(id) on delete cascade,
  decision text not null, -- approved|rejected
  rationale text not null default '',
  decided_by uuid not null,
  decided_at timestamptz not null
);

create index if not exists document_approvals_doc_idx on document_approvals(tenant_id, document_id, decided_at);

