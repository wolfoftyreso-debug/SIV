-- 004_employment_case_evidence
-- Evidence is stored in private Blob; DB stores metadata + quarantine status.

create table if not exists evidence_items (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  case_id uuid not null references employment_cases(id) on delete cascade,
  title text not null,
  description text not null default '',
  blob_path text not null,
  sha256 text null,
  size_bytes integer not null,
  mime_type text not null,
  origin text not null, -- upload|email_inbound|generated|import
  uploaded_by uuid not null,
  uploaded_at timestamptz not null,
  quarantine_status text not null, -- pending|clean|blocked
  classification data_classification not null
);

create index if not exists evidence_items_tenant_case_idx on evidence_items(tenant_id, case_id);

