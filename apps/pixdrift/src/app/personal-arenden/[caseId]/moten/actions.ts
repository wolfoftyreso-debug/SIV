"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseMeetings, meetingParticipants } from "@/db/schema";
import { randomUUID } from "node:crypto";
import { generateMeetingInvitationAndDraftEmail } from "@/modules/employment-cases/infrastructure/communications/communicationService";

const CreateMeetingSchema = z.object({
  caseId: z.string().min(1),
  meetingType: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  purpose: z.string().trim().min(1).max(2000),
  scheduledAtIso: z.string().min(10),
  location: z.string().trim().max(200).optional(),
  employeeName: z.string().trim().min(1).max(120),
  employeeEmail: z.string().trim().email().optional().or(z.literal("")),
});

export async function createMeetingAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
  }

  const parsed = CreateMeetingSchema.safeParse({
    caseId: formData.get("caseId"),
    meetingType: formData.get("meetingType"),
    title: formData.get("title"),
    purpose: formData.get("purpose"),
    scheduledAtIso: formData.get("scheduledAtIso"),
    location: formData.get("location"),
    employeeName: formData.get("employeeName"),
    employeeEmail: formData.get("employeeEmail"),
  });
  if (!parsed.success) {
    throw new EmploymentCasesError({ code: "CASE_TRANSITION_NOT_ALLOWED", httpStatus: 400, message: "Ogiltigt formulär." });
  }

  const nowIso = new Date().toISOString();
  const meetingId = randomUUID();

  await withTenantTx(actor.tenantId, async (db) => {
    await db.insert(caseMeetings).values({
      id: meetingId,
      tenantId: actor.tenantId,
      caseId: parsed.data.caseId,
      meetingType: parsed.data.meetingType,
      title: parsed.data.title,
      purpose: parsed.data.purpose,
      scheduledAt: new Date(parsed.data.scheduledAtIso),
      location: parsed.data.location ?? null,
      status: "scheduled",
      createdBy: actor.actorId,
      createdAt: new Date(nowIso),
      updatedAt: new Date(nowIso),
      version: 1,
    });

    await db.insert(meetingParticipants).values({
      id: randomUUID(),
      tenantId: actor.tenantId,
      caseId: parsed.data.caseId,
      meetingId,
      participantName: parsed.data.employeeName,
      participantEmail: parsed.data.employeeEmail || null,
      role: "employee",
    });
  });

  revalidatePath(`/personal-arenden/${parsed.data.caseId}/moten`);
}

export async function generateInvitationAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
  }
  const caseId = String(formData.get("caseId") ?? "");
  const meetingId = String(formData.get("meetingId") ?? "");
  if (!caseId || !meetingId) return;

  await generateMeetingInvitationAndDraftEmail({
    tenantId: actor.tenantId,
    caseId,
    meetingId,
    actorId: actor.actorId,
  });

  revalidatePath(`/personal-arenden/${caseId}/dokument`);
  revalidatePath(`/personal-arenden/${caseId}/kommunikation`);
  revalidatePath(`/personal-arenden/${caseId}/tidslinje`);
  revalidatePath(`/personal-arenden/${caseId}/moten`);
}

