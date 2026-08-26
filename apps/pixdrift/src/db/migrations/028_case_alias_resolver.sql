-- 028_case_alias_resolver
-- Resolve case alias (local-part + domain) to tenant_id + case_id without requiring tenant context.
-- This is used by inbound email processing and must be tightly scoped.

create or replace function resolve_case_email_alias(inbound_domain text, alias_local_part text)
returns table (tenant_id uuid, case_id uuid)
language sql
stable
security definer
as $$
  select tenant_id, case_id
  from case_email_aliases
  where case_email_aliases.inbound_domain = inbound_domain
    and case_email_aliases.alias_local_part = alias_local_part
    and case_email_aliases.active = true
  limit 1;
$$;

revoke all on function resolve_case_email_alias(text, text) from public;
grant execute on function resolve_case_email_alias(text, text) to pixdrift_app;

