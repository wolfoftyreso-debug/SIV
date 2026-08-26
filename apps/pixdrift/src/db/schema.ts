import { pgEnum, pgTable, text, timestamp, uuid, integer, jsonb, boolean, varchar, date } from "drizzle-orm/pg-core";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

export const dataClassificationEnum = pgEnum("data_classification", [
  "public",
  "internal",
  "confidential",
  "highly_confidential",
  "special_category",
  "criminal_allegation",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "draft",
  "active",
  "awaiting_employer_input",
  "awaiting_employee_response",
  "awaiting_external_response",
  "awaiting_review",
  "paused",
  "blocked",
  "escalated",
  "resolved",
  "closed",
  "archived",
]);

export const casePhaseEnum = pgEnum("case_phase", [
  "intake",
  "employment_context",
  "initial_assessment",
  "fact_finding",
  "employee_dialogue",
  "corrective_action",
  "rehabilitation_assessment",
  "work_adjustment",
  "follow_up",
  "reassignment_assessment",
  "union_process",
  "formal_notice",
  "formal_decision",
  "exit_execution",
  "dispute_management",
  "resolution",
  "closure",
]);

export const factStatusEnum = pgEnum("fact_status", [
  "proposed",
  "alleged",
  "corroborated",
  "accepted",
  "disputed",
  "withdrawn",
  "inconclusive",
]);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: uniqueIndex("tenants_name_uidx").on(t.name),
  })
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    roles: jsonb("roles").notNull().$type<string[]>().default([]),
    synthetic: boolean("synthetic").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("users_tenant_idx").on(t.tenantId),
    emailTenantUidx: uniqueIndex("users_tenant_email_uidx").on(t.tenantId, t.email),
  })
);

export const employmentCases = pgTable(
  "employment_cases",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    externalCaseNumber: varchar("external_case_number", { length: 32 }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),

    status: caseStatusEnum("status").notNull(),
    phase: casePhaseEnum("phase").notNull(),
    confidentialityLevel: dataClassificationEnum("confidentiality_level").notNull(),

    activeTracks: jsonb("active_tracks").notNull().$type<unknown[]>().default([]),

    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull(),
  },
  (t) => ({
    tenantIdx: index("employment_cases_tenant_idx").on(t.tenantId),
    statusIdx: index("employment_cases_status_idx").on(t.tenantId, t.status),
    createdAtIdx: index("employment_cases_created_at_idx").on(t.tenantId, t.createdAt),
    externalUidx: uniqueIndex("employment_cases_external_number_uidx").on(t.tenantId, t.externalCaseNumber),
  })
);

export const caseEvents = pgTable(
  "case_events",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),

    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    occurredDatePrecision: text("occurred_date_precision").notNull(),
    employerKnowledgeAt: timestamp("employer_knowledge_at", { withTimezone: true }),
    location: text("location"),
    sourceType: text("source_type").notNull(),
    sourceActorId: uuid("source_actor_id"),
    verificationStatus: text("verification_status").notNull(),
    disputedStatus: text("disputed_status").notNull(),
    confidentialityLevel: dataClassificationEnum("confidentiality_level").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull(),
  },
  (t) => ({
    tenantCaseIdx: index("case_events_tenant_case_idx").on(t.tenantId, t.caseId),
    createdAtIdx: index("case_events_created_at_idx").on(t.tenantId, t.caseId, t.createdAt),
  })
);

export const caseFacts = pgTable(
  "case_facts",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),

    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    valueType: text("value_type").notNull(),
    status: factStatusEnum("status").notNull(),
    confidenceSource: text("confidence_source").notNull(),
    sourceReferences: jsonb("source_references").notNull().$type<unknown[]>().default([]),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    supersedesFactId: uuid("supersedes_fact_id"),
  },
  (t) => ({
    tenantCaseIdx: index("case_facts_tenant_case_idx").on(t.tenantId, t.caseId),
    keyIdx: index("case_facts_key_idx").on(t.tenantId, t.caseId, t.key),
  })
);

export const caseBlockers = pgTable(
  "case_blockers",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    blockerKey: text("blocker_key").notNull(),
    status: text("status").notNull(), // active|resolved
    messageKey: text("message_key").notNull(),
    details: jsonb("details").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
  },
  (t) => ({
    tenantCaseIdx: index("case_blockers_tenant_case_idx").on(t.tenantId, t.caseId),
    activeIdx: index("case_blockers_active_idx").on(t.tenantId, t.caseId, t.status),
  })
);

export const caseTasks = pgTable(
  "case_tasks",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by"),
  },
  (t) => ({
    tenantCaseIdx: index("case_tasks_tenant_case_idx").on(t.tenantId, t.caseId),
    dueIdx: index("case_tasks_due_idx").on(t.tenantId, t.dueAt),
  })
);

export const caseDeadlines = pgTable(
  "case_deadlines",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    deadlineKey: text("deadline_key").notNull(),
    dueDate: date("due_date").notNull(),
    timezone: text("timezone").notNull().default("Europe/Stockholm"),
    computedFrom: jsonb("computed_from").notNull().$type<Record<string, unknown>>().default({}),
    ruleVersionRef: text("rule_version_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").notNull(),
    manualOverride: boolean("manual_override").notNull().default(false),
    overrideReason: text("override_reason"),
  },
  (t) => ({
    tenantCaseIdx: index("case_deadlines_tenant_case_idx").on(t.tenantId, t.caseId),
    dueIdx: index("case_deadlines_due_idx").on(t.tenantId, t.dueDate),
  })
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payloadReference: text("payload_reference").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(10),
    status: text("status").notNull(), // queued|processing|failed|done|dead_letter
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    correlationId: text("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("outbox_status_idx").on(t.status, t.nextAttemptAt),
    idempotencyUidx: uniqueIndex("outbox_idempotency_uidx").on(t.tenantId, t.idempotencyKey),
  })
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id"),
    actorId: uuid("actor_id").notNull(),
    operation: text("operation").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    correlationId: text("correlation_id"),
    sessionId: text("session_id"),
    result: text("result").notNull(),
    reason: text("reason"),
    previousHash: text("previous_hash"),
    eventHash: text("event_hash").notNull(),
    hashVersion: integer("hash_version").notNull(),
    metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
  },
  (t) => ({
    tenantIdx: index("audit_events_tenant_idx").on(t.tenantId, t.occurredAt),
    caseIdx: index("audit_events_case_idx").on(t.tenantId, t.caseId, t.occurredAt),
  })
);

export const caseSubjects = pgTable(
  "case_subjects",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalRef: text("external_ref"),
    displayName: text("display_name").notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("case_subjects_tenant_idx").on(t.tenantId),
  })
);

export const caseParticipants = pgTable(
  "case_participants",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    participantType: text("participant_type").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").references(() => caseSubjects.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantCaseIdx: index("case_participants_tenant_case_idx").on(t.tenantId, t.caseId),
  })
);

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    blobPath: text("blob_path").notNull(),
    sha256: text("sha256"),
    sizeBytes: integer("size_bytes").notNull(),
    mimeType: text("mime_type").notNull(),
    origin: text("origin").notNull(),
    uploadedBy: uuid("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
    quarantineStatus: text("quarantine_status").notNull(),
    classification: dataClassificationEnum("classification").notNull(),
  },
  (t) => ({
    tenantCaseIdx: index("evidence_items_tenant_case_idx").on(t.tenantId, t.caseId),
  })
);

export const documentTemplates = pgTable(
  "document_templates",
  {
    id: uuid("id").primaryKey(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    notLegallyReviewed: boolean("not_legally_reviewed").notNull().default(true),
    synthetic: boolean("synthetic").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    keyUidx: uniqueIndex("document_templates_key_uidx").on(t.key),
  })
);

export const documentTemplateVersions = pgTable(
  "document_template_versions",
  {
    id: uuid("id").primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => documentTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: jsonb("content").notNull().$type<Record<string, unknown>>(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    templateVersionUidx: uniqueIndex("document_template_versions_uidx").on(t.templateId, t.version),
  })
);

export const caseDocuments = pgTable(
  "case_documents",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    status: text("status").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull(),
  },
  (t) => ({
    tenantCaseIdx: index("case_documents_tenant_case_idx").on(t.tenantId, t.caseId),
  })
);

export const caseDocumentVersions = pgTable(
  "case_document_versions",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => caseDocuments.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    html: text("html").notNull(),
    pdfBlobPath: text("pdf_blob_path"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    docVersionUidx: uniqueIndex("case_document_versions_uidx").on(t.documentId, t.version),
  })
);

export const documentApprovals = pgTable(
  "document_approvals",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => caseDocuments.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    rationale: text("rationale").notNull().default(""),
    decidedBy: uuid("decided_by").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    docIdx: index("document_approvals_doc_idx").on(t.tenantId, t.documentId, t.decidedAt),
  })
);

export const caseEmailAliases = pgTable(
  "case_email_aliases",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    aliasLocalPart: text("alias_local_part").notNull(),
    inboundDomain: text("inbound_domain").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    active: boolean("active").notNull().default(true),
  },
  (t) => ({
    aliasUidx: uniqueIndex("case_email_aliases_uidx").on(t.inboundDomain, t.aliasLocalPart),
    tenantCaseIdx: index("case_email_aliases_tenant_case_idx").on(t.tenantId, t.caseId),
  })
);

export const caseCommunications = pgTable(
  "case_communications",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(),
    status: text("status").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    fromAddress: text("from_address").notNull(),
    toAddresses: jsonb("to_addresses").notNull().$type<string[]>().default([]),
    ccAddresses: jsonb("cc_addresses").notNull().$type<string[]>().default([]),
    bccAddresses: jsonb("bcc_addresses").notNull().$type<string[]>().default([]),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    threadKey: text("thread_key"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull(),
  },
  (t) => ({
    tenantCaseIdx: index("case_communications_tenant_case_idx").on(t.tenantId, t.caseId),
  })
);

export const communicationEvents = pgTable(
  "communication_events",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => employmentCases.id, { onDelete: "cascade" }),
    communicationId: uuid("communication_id")
      .notNull()
      .references(() => caseCommunications.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>().default({}),
  },
  (t) => ({
    commIdx: index("communication_events_comm_idx").on(t.tenantId, t.communicationId, t.occurredAt),
  })
);

