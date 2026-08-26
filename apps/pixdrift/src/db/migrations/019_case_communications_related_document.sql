-- 019_case_communications_related_document
-- Link outbound communications to a case document that must be approved before sending.

alter table case_communications
  add column if not exists related_document_id uuid null references case_documents(id) on delete set null;

