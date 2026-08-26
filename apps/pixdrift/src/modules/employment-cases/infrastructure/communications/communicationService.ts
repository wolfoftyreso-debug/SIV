import { randomUUID } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";

import { withTenantTx } from "@/core/tenantTx";
import {
  caseCommunications,
  communicationEvents,
  caseEmailAliases,
  outboxEvents,
  outboxPayloads,
} from "@/db/schema";
import { getEmailProvider } from "../email/emailProviderFactory";
import { sanitizeInboundHtml } from "../email/sanitizeInboundHtml";
import { storePrivateBytesLocal } from "@/core/localBlob";
import { readPrivateBytesLocal } from "@/core/localBlob";
import { evidenceItems, caseMeetings, meetingParticipants, caseDocuments, caseDocumentVersions } from "@/db/schema";
import { renderDemoTemplate, ensureDemoTemplates } from "@/modules/employment-cases/infrastructure/documents/demoTemplates";
import { buildIcs } from "@/modules/employment-cases/infrastructure/meetings/ics";
import { EmploymentCasesError } from "@pia/employment-cases";

export async function ensureCaseAlias(input: { tenantId: string; caseId: string; inboundDomain: string }) {
  const token = `case-${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  return withTenantTx(input.tenantId, async (db) => {
    const existing = (
      await db
        .select()
        .from(caseEmailAliases)
        .where(and(eq(caseEmailAliases.tenantId, input.tenantId), eq(caseEmailAliases.caseId, input.caseId), eq(caseEmailAliases.active, true)))
        .limit(1)
    )[0];
    if (existing) return existing;

    await db.insert(caseEmailAliases).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      caseId: input.caseId,
      aliasLocalPart: token,
      inboundDomain: input.inboundDomain,
      active: true,
    });

    return (
      await db
        .select()
        .from(caseEmailAliases)
        .where(and(eq(caseEmailAliases.tenantId, input.tenantId), eq(caseEmailAliases.caseId, input.caseId), eq(caseEmailAliases.active, true)))
        .limit(1)
    )[0]!;
  });
}

export async function createOutboundDraft(input: {
  tenantId: string;
  caseId: string;
  actorId: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  to: string[];
  attachments?: Array<{ blobPath: string; filename: string; contentType: string }>;
  relatedDocumentId?: string | null;
}) {
  const now = new Date().toISOString();
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "no-reply@pixdrift.local";

  return withTenantTx(input.tenantId, async (db) => {
    const id = randomUUID();
    await db.insert(caseCommunications).values({
      id,
      tenantId: input.tenantId,
      caseId: input.caseId,
      direction: "outbound",
      status: "draft",
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
      fromAddress,
      toAddresses: input.to,
      ccAddresses: [],
      bccAddresses: [],
      attachments: input.attachments ?? [],
      relatedDocumentId: input.relatedDocumentId ?? null,
      provider: null,
      providerMessageId: null,
      threadKey: null,
      createdBy: input.actorId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      version: 1,
    });
    return { communicationId: id };
  });
}

export async function approveOutboundDraft(input: { tenantId: string; caseId: string; communicationId: string; actorId: string }) {
  const now = new Date().toISOString();
  return withTenantTx(input.tenantId, async (db) => {
    const row = (
      await db
        .select()
        .from(caseCommunications)
        .where(and(eq(caseCommunications.tenantId, input.tenantId), eq(caseCommunications.caseId, input.caseId), eq(caseCommunications.id, input.communicationId)))
        .limit(1)
    )[0];
    if (!row) return { ok: false as const };

    await db
      .update(caseCommunications)
      .set({ status: "approved", updatedAt: new Date(now), version: row.version + 1 })
      .where(and(eq(caseCommunications.tenantId, input.tenantId), eq(caseCommunications.id, input.communicationId)));

    return { ok: true as const };
  });
}

export async function enqueueSendOutbound(input: { tenantId: string; caseId: string; communicationId: string; actorId: string }) {
  const nowIso = new Date().toISOString();
  const idempotencyKey = `email.send:${input.communicationId}`;

  return withTenantTx(input.tenantId, async (db) => {
    const comm = (
      await db
        .select()
        .from(caseCommunications)
        .where(and(eq(caseCommunications.tenantId, input.tenantId), eq(caseCommunications.caseId, input.caseId), eq(caseCommunications.id, input.communicationId)))
        .limit(1)
    )[0];
    if (!comm) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Meddelandet hittades inte." });
    }

    if (comm.status !== "approved") {
      throw new EmploymentCasesError({
        code: "COMMUNICATION_NOT_APPROVED",
        httpStatus: 409,
        message: "Meddelandet måste godkännas innan det kan köas för skickning.",
      });
    }

    if (comm.relatedDocumentId) {
      const doc = (
        await db
          .select()
          .from(caseDocuments)
          .where(and(eq(caseDocuments.tenantId, input.tenantId), eq(caseDocuments.caseId, input.caseId), eq(caseDocuments.id, comm.relatedDocumentId)))
          .limit(1)
      )[0];
      if (!doc || doc.status !== "approved") {
        throw new EmploymentCasesError({
          code: "DOCUMENT_NOT_APPROVED",
          httpStatus: 409,
          message: "Dokumentet måste godkännas innan utskick kan ske.",
        });
      }
    }

    const payloadId = randomUUID();
    await db.insert(outboxPayloads).values({
      id: payloadId,
      tenantId: input.tenantId,
      payload: {
        type: "email.send",
        tenantId: input.tenantId,
        caseId: input.caseId,
        communicationId: input.communicationId,
      },
    });

    await db.insert(outboxEvents).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      type: "email.send",
      payloadReference: payloadId,
      idempotencyKey,
      attempt: 0,
      maxAttempts: 10,
      status: "queued",
      nextAttemptAt: new Date(nowIso),
      lastErrorCode: null,
      correlationId: null,
    });

    await db
      .update(caseCommunications)
      .set({ status: "queued", updatedAt: new Date(nowIso) })
      .where(and(eq(caseCommunications.tenantId, input.tenantId), eq(caseCommunications.id, input.communicationId)));

    return { ok: true as const };
  });
}

export async function dispatchQueuedEmailSend(input: { tenantId: string; payload: any; nowIso: string }) {
  const provider = getEmailProvider();

  return withTenantTx(input.tenantId, async (db) => {
    const commId = String(input.payload.communicationId);
    const comm = (
      await db.select().from(caseCommunications).where(and(eq(caseCommunications.tenantId, input.tenantId), eq(caseCommunications.id, commId))).limit(1)
    )[0];
    if (!comm) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Meddelandet hittades inte." });
    }

    if (comm.status !== "queued") {
      throw new EmploymentCasesError({
        code: "COMMUNICATION_NOT_APPROVED",
        httpStatus: 409,
        message: "Meddelandet är inte köat för skickning.",
      });
    }

    if (comm.relatedDocumentId) {
      const doc = (
        await db
          .select()
          .from(caseDocuments)
          .where(and(eq(caseDocuments.tenantId, input.tenantId), eq(caseDocuments.caseId, comm.caseId), eq(caseDocuments.id, comm.relatedDocumentId)))
          .limit(1)
      )[0];
      if (!doc || doc.status !== "approved") {
        throw new EmploymentCasesError({
          code: "DOCUMENT_NOT_APPROVED",
          httpStatus: 409,
          message: "Dokumentet måste godkännas innan utskick kan ske.",
        });
      }
    }

    const inboundDomain = process.env.EMAIL_INBOUND_DOMAIN || "inbound.pixdrift.local";
    const alias = await ensureCaseAlias({ tenantId: input.tenantId, caseId: comm.caseId, inboundDomain });
    const replyTo = `${alias.aliasLocalPart}@${alias.inboundDomain}`;

    const attachmentsMeta = (comm.attachments as any) ?? [];
    const attachments = [];
    for (const a of attachmentsMeta) {
      try {
        const bytes = await readPrivateBytesLocal(String(a.blobPath));
        attachments.push({
          filename: String(a.filename),
          contentType: String(a.contentType ?? "application/octet-stream"),
          bytes,
        });
      } catch {
        // best-effort; attachment errors should not corrupt internal state
      }
    }

    const result = await provider.send({
      from: comm.fromAddress,
      to: (comm.toAddresses as any) ?? [],
      cc: (comm.ccAddresses as any) ?? [],
      bcc: (comm.bccAddresses as any) ?? [],
      subject: comm.subject,
      text: comm.bodyText,
      html: comm.bodyHtml ?? undefined,
      replyTo,
      headers: { "x-pixdrift-case-id": comm.caseId },
      attachments,
    });

    await db
      .update(caseCommunications)
      .set({
        status: "sent",
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        updatedAt: new Date(input.nowIso),
        version: comm.version + 1,
      })
      .where(and(eq(caseCommunications.tenantId, input.tenantId), eq(caseCommunications.id, commId)));

    await db.insert(communicationEvents).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      caseId: comm.caseId,
      communicationId: commId,
      eventType: "provider_accepted",
      occurredAt: new Date(input.nowIso),
      payload: { provider: result.provider, providerMessageId: result.providerMessageId },
    });

    return { ok: true as const };
  });
}

export async function processInboundReceivedEmail(input: { providerEmailId: string; nowIso: string }) {
  const provider = getEmailProvider();
  const received = await provider.getReceivedEmail(input.providerEmailId);
  const attachments = await provider.listReceivedAttachments(input.providerEmailId);

  // Resolve case by alias address in "to"
  const to = received.to ?? [];
  const target = to.map((a) => a.trim()).find((addr) => addr.includes("@")) ?? "";
  const [local, domain] = target.split("@");
  if (!local || !domain) return { ok: false as const, reason: "no_alias" as const };

  const url = process.env.DATABASE_URL || process.env.DATABASE_MIGRATION_URL;
  if (!url) return { ok: false as const, reason: "no_db" as const };

  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1, ssl: "require" });
  try {
    const rows = await sql`select tenant_id, case_id from resolve_case_email_alias(${domain}, ${local})`;
    const resolved = rows[0] as any;
    if (!resolved) return { ok: false as const, reason: "unresolved" as const };

    const tenantId = String(resolved.tenant_id);
    const caseId = String(resolved.case_id);

    const cleanHtml = received.html ? sanitizeInboundHtml(received.html) : undefined;

    await withTenantTx(tenantId, async (db) => {
      const commId = randomUUID();
      await db.insert(caseCommunications).values({
        id: commId,
        tenantId,
        caseId,
        direction: "inbound",
        status: "received",
        subject: received.subject ?? "(utan ämne)",
        bodyText: received.text ?? "",
        bodyHtml: cleanHtml ?? null,
        fromAddress: received.from,
        toAddresses: received.to,
        ccAddresses: [],
        bccAddresses: [],
        provider: received.provider,
        providerMessageId: received.providerEmailId,
        threadKey: null,
        createdBy: tenantId, // system
        createdAt: new Date(input.nowIso),
        updatedAt: new Date(input.nowIso),
        version: 1,
      });

      await db.insert(communicationEvents).values({
        id: randomUUID(),
        tenantId,
        caseId,
        communicationId: commId,
        eventType: "received",
        occurredAt: new Date(input.nowIso),
        payload: { providerEmailId: received.providerEmailId },
      });

      for (const a of attachments) {
        // Download bytes and store in local private storage for dev
        const bin = await provider.getReceivedAttachment(received.providerEmailId, a.id);
        const stored = await storePrivateBytesLocal({
          tenantId,
          caseId,
          filename: bin.filename,
          bytes: bin.bytes,
        });

        await db.insert(evidenceItems).values({
          id: randomUUID(),
          tenantId,
          caseId,
          title: `Bilaga: ${bin.filename}`,
          description: "Inkommande e-postbilaga (karantän)",
          blobPath: stored.blobPath,
          sha256: stored.sha256,
          sizeBytes: stored.sizeBytes,
          mimeType: bin.contentType,
          origin: "email_inbound",
          uploadedBy: tenantId,
          uploadedAt: new Date(input.nowIso),
          quarantineStatus: "pending",
          classification: "confidential",
        });
      }
    });

    return { ok: true as const, tenantId, caseId };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function generateMeetingInvitationAndDraftEmail(input: {
  tenantId: string;
  caseId: string;
  meetingId: string;
  actorId: string;
}) {
  const nowIso = new Date().toISOString();

  return withTenantTx(input.tenantId, async (db) => {
    await ensureDemoTemplates(db);

    const meeting = (
      await db
        .select()
        .from(caseMeetings)
        .where(and(eq(caseMeetings.tenantId, input.tenantId), eq(caseMeetings.caseId, input.caseId), eq(caseMeetings.id, input.meetingId)))
        .limit(1)
    )[0];
    if (!meeting) return { ok: false as const, reason: "meeting_not_found" as const };

    const participants = await db
      .select()
      .from(meetingParticipants)
      .where(and(eq(meetingParticipants.tenantId, input.tenantId), eq(meetingParticipants.meetingId, input.meetingId)));

    const employeeEmail =
      participants.find((p) => p.role === "employee" && p.participantEmail)?.participantEmail ??
      participants.find((p) => p.participantEmail)?.participantEmail ??
      null;

    const scheduled = meeting.scheduledAt;
    const date = scheduled.toLocaleDateString("sv-SE");
    const time = scheduled.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

    const html = renderDemoTemplate("meeting_invitation", {
      employer_name: "Pixdrift (demo)",
      employee_name: participants.find((p) => p.role === "employee")?.participantName ?? "Arbetstagare",
      meeting_title: meeting.title,
      meeting_purpose: meeting.purpose,
      meeting_date: date,
      meeting_time: time,
      meeting_location: meeting.location ?? "—",
      participants: participants.map((p) => p.participantName).join(", "),
      preparation_items: "Ta med eventuell relevant information eller frågor.",
      response_contact: "Svara på detta mejl för att bekräfta eller ställa frågor.",
    });

    const docId = randomUUID();
    await db.insert(caseDocuments).values({
      id: docId,
      tenantId: input.tenantId,
      caseId: input.caseId,
      templateKey: "meeting_invitation",
      status: "generated",
      createdBy: input.actorId,
      createdAt: new Date(nowIso),
      updatedAt: new Date(nowIso),
      version: 1,
    });

    await db.insert(caseDocumentVersions).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      caseId: input.caseId,
      documentId: docId,
      version: 1,
      html,
      pdfBlobPath: null,
      createdBy: input.actorId,
      createdAt: new Date(nowIso),
    });

    // Build ICS and store to private blob (local for now; will map to Vercel Blob later).
    const ics = buildIcs({
      uid: `pixdrift-${meeting.id}`,
      startUtc: new Date(meeting.scheduledAt),
      durationMinutes: 60,
      summary: meeting.title,
      description: meeting.purpose,
      location: meeting.location ?? undefined,
      organizerEmail: process.env.EMAIL_FROM_ADDRESS ?? undefined,
      attendees: participants
        .filter((p) => p.participantEmail)
        .map((p) => ({ email: p.participantEmail!, name: p.participantName })),
    });

    const stored = await storePrivateBytesLocal({
      tenantId: input.tenantId,
      caseId: input.caseId,
      filename: "kallelse.ics",
      bytes: new TextEncoder().encode(ics),
    });

    // Create outbound email draft referencing the ICS attachment.
    const subject = `Kallelse: ${meeting.title}`;
    const bodyText = `Kallelse till möte\n\nTitel: ${meeting.title}\nSyfte: ${meeting.purpose}\nTid: ${date} kl. ${time}\nPlats: ${meeting.location ?? "—"}\n\nNOT_LEGALLY_REVIEWED (teknisk mall)\n`;

    const commId = randomUUID();
    await db.insert(caseCommunications).values({
      id: commId,
      tenantId: input.tenantId,
      caseId: input.caseId,
      direction: "outbound",
      status: "draft",
      subject,
      bodyText,
      bodyHtml: html,
      fromAddress: process.env.EMAIL_FROM_ADDRESS || "no-reply@pixdrift.local",
      toAddresses: employeeEmail ? [employeeEmail] : [],
      ccAddresses: [],
      bccAddresses: [],
      attachments: [{ blobPath: stored.blobPath, filename: "kallelse.ics", contentType: "text/calendar" }],
      relatedDocumentId: docId,
      provider: null,
      providerMessageId: null,
      threadKey: null,
      createdBy: input.actorId,
      createdAt: new Date(nowIso),
      updatedAt: new Date(nowIso),
      version: 1,
    });

    return { ok: true as const, documentId: docId, communicationId: commId };
  });
}

