-- 017_employment_case_rls_meetings

alter table case_meetings enable row level security;
alter table meeting_participants enable row level security;

drop policy if exists case_meetings_isolation on case_meetings;
create policy case_meetings_isolation on case_meetings
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

drop policy if exists meeting_participants_isolation on meeting_participants;
create policy meeting_participants_isolation on meeting_participants
  using (tenant_id = app_require_tenant_id())
  with check (tenant_id = app_require_tenant_id());

grant select, insert, update, delete on
  case_meetings,
  meeting_participants
to pixdrift_app;

