"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { approveOutboundDraft, createOutboundDraft, enqueueSendOutbound } from "@/modules/employment-cases/infrastructure/communications/communicationService";

const CreateMessageSchema = z.object({
  caseId: z.string().min(1),
  to: z.string().trim().min(3),
  subject: z.string().trim().min(1).max(200),
  bodyText: z.string().trim().min(3).max(20_000),
});

export async function createMessageAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
  }

  const parsed = CreateMessageSchema.safeParse({
    caseId: formData.get("caseId"),
    to: formData.get("to"),
    subject: formData.get("subject"),
    bodyText: formData.get("bodyText"),
  });
  if (!parsed.success) {
    throw new EmploymentCasesError({ code: "CASE_TRANSITION_NOT_ALLOWED", httpStatus: 400, message: "Ogiltigt formulär." });
  }

  await createOutboundDraft({
    tenantId: actor.tenantId,
    caseId: parsed.data.caseId,
    actorId: actor.actorId,
    subject: parsed.data.subject,
    bodyText: parsed.data.bodyText,
    to: parsed.data.to.split(",").map((x) => x.trim()).filter(Boolean),
  });

  revalidatePath(`/personal-arenden/${parsed.data.caseId}/kommunikation`);
}

export async function approveMessageAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
  }
  const caseId = String(formData.get("caseId") ?? "");
  const messageId = String(formData.get("messageId") ?? "");
  if (!caseId || !messageId) return;

  await approveOutboundDraft({ tenantId: actor.tenantId, caseId, communicationId: messageId, actorId: actor.actorId });
  revalidatePath(`/personal-arenden/${caseId}/kommunikation`);
}

export async function sendMessageAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
  }
  const caseId = String(formData.get("caseId") ?? "");
  const messageId = String(formData.get("messageId") ?? "");
  if (!caseId || !messageId) return;

  await enqueueSendOutbound({ tenantId: actor.tenantId, caseId, communicationId: messageId, actorId: actor.actorId });
  revalidatePath(`/personal-arenden/${caseId}/kommunikation`);
}

