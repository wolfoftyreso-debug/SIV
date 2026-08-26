"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { evaluateCaseRulesAndSyncBlockers } from "@/modules/employment-cases/infrastructure/dbEvaluateCaseRules";
import { revalidatePath } from "next/cache";

const CreateDraftSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(10).max(10_000),
});

export async function createEmploymentCaseDraftAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({
      code: "CASE_ACCESS_DENIED",
      httpStatus: 403,
      message: "Du saknar behörighet att skapa personalärenden.",
    });
  }

  const parsed = CreateDraftSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new EmploymentCasesError({
      code: "CASE_TRANSITION_NOT_ALLOWED",
      httpStatus: 400,
      message: "Formuläret är inte korrekt ifyllt.",
      details: parsed.error.flatten(),
    });
  }

  const service = getEmploymentCaseService();
  const { caseId } = await service.createDraft({
    tenantId: actor.tenantId,
    actorId: actor.actorId,
    title: parsed.data.title ?? "Personalärende",
    description: parsed.data.description,
  });

  redirect(`/personal-arenden/${caseId}`);
}

export async function evaluateEmploymentCaseRulesAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({
      code: "CASE_ACCESS_DENIED",
      httpStatus: 403,
      message: "Du saknar behörighet att utvärdera regler.",
    });
  }

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;

  const nowIso = new Date().toISOString();
  const res = await evaluateCaseRulesAndSyncBlockers({
    tenantId: actor.tenantId,
    actorId: actor.actorId,
    caseId,
    nowIso,
  });

  if (!res.ok) {
    throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Ärendet hittades inte." });
  }

  revalidatePath(`/personal-arenden/${caseId}`);
}

