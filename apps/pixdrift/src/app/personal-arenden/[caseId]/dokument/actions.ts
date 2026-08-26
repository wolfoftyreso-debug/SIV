"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@pia/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseDocuments, documentApprovals } from "@/db/schema";

export async function approveDocumentAction(formData: FormData) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.write")) {
    throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
  }

  const caseId = String(formData.get("caseId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  if (!caseId || !documentId) return;

  const nowIso = new Date().toISOString();

  await withTenantTx(actor.tenantId, async (db) => {
    const doc = (
      await db
        .select()
        .from(caseDocuments)
        .where(and(eq(caseDocuments.tenantId, actor.tenantId), eq(caseDocuments.caseId, caseId), eq(caseDocuments.id, documentId)))
        .limit(1)
    )[0];
    if (!doc) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Dokumentet hittades inte." });
    }

    await db.insert(documentApprovals).values({
      id: randomUUID(),
      tenantId: actor.tenantId,
      caseId,
      documentId,
      decision: "approved",
      rationale: "",
      decidedBy: actor.actorId,
      decidedAt: new Date(nowIso),
    });

    await db
      .update(caseDocuments)
      .set({ status: "approved", updatedAt: new Date(nowIso), version: doc.version + 1 })
      .where(and(eq(caseDocuments.tenantId, actor.tenantId), eq(caseDocuments.id, documentId)));
  });

  revalidatePath(`/personal-arenden/${caseId}/dokument`);
  revalidatePath(`/personal-arenden/${caseId}/kommunikation`);
  revalidatePath(`/personal-arenden/${caseId}/tidslinje`);
}

