-- 018_case_communications_attachments
-- Store attachment metadata references for outbound/inbound comms (bytes are stored in private blob).

alter table case_communications
  add column if not exists attachments jsonb not null default '[]'::jsonb;

