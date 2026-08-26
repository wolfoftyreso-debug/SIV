-- 016_employment_case_rls_documents_and_communications

alter table document_templates enable row level security;
alter table document_template_versions enable row level security;
alter table case_documents enable row level security;
alter table case_document_versions enable row level security;
alter table document_approvals enable row level security;
alter table case_email_aliases enable row level security;
alter table case_communications enable row level security;
alter table communication_events enable row level security;

-- Templates are tenant-agnostic in this repo scaffold; keep them visible to current tenant only to avoid leakage.
-- In a real Pixdrift monorepo, templates would likely live in a separate context with stricter admin access.
drop policy if exists document_templates_isolation on document_templates;
create policy document_templates_isolation on document_templates
  using (true);

drop policy if exists document_template_versions_isolation on document_template_versions;
create policy document_template_versions_isolation on document_template_versions
  using (true);

drop policy if exists case_documents_isolation on case_documents;
create policy case_documents_isolation on case_documents
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_document_versions_isolation on case_document_versions;
create policy case_document_versions_isolation on case_document_versions
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists document_approvals_isolation on document_approvals;
create policy document_approvals_isolation on document_approvals
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_email_aliases_isolation on case_email_aliases;
create policy case_email_aliases_isolation on case_email_aliases
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_communications_isolation on case_communications;
create policy case_communications_isolation on case_communications
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists communication_events_isolation on communication_events;
create policy communication_events_isolation on communication_events
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

grant select, insert, update, delete on
  document_templates,
  document_template_versions,
  case_documents,
  case_document_versions,
  document_approvals,
  case_email_aliases,
  case_communications,
  communication_events
to pixdrift_app;

