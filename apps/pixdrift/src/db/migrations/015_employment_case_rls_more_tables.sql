-- 015_employment_case_rls_more_tables
-- Extend RLS enforcement to additional case tables introduced after 012.

alter table case_blockers enable row level security;
alter table case_tasks enable row level security;
alter table case_deadlines enable row level security;

drop policy if exists case_blockers_isolation on case_blockers;
create policy case_blockers_isolation on case_blockers
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_tasks_isolation on case_tasks;
create policy case_tasks_isolation on case_tasks
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists case_deadlines_isolation on case_deadlines;
create policy case_deadlines_isolation on case_deadlines
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

grant select, insert, update, delete on
  case_blockers,
  case_tasks,
  case_deadlines
to pixdrift_app;

