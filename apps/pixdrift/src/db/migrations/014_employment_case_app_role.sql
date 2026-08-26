-- 014_employment_case_app_role
-- Create a least-privilege application role to ensure RLS is actually enforced.
--
-- Intended usage:
-- - DATABASE_MIGRATION_URL: owner/admin role (runs migrations)
-- - DATABASE_URL: pixdrift_app role (runtime)

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'pixdrift_app') then
    create role pixdrift_app login;
  end if;
end
$$;

grant usage on schema public to pixdrift_app;

grant select, insert, update, delete on
  tenants,
  users,
  employment_cases,
  case_subjects,
  case_participants,
  case_events,
  case_facts,
  evidence_items,
  audit_events,
  outbox_events
to pixdrift_app;

