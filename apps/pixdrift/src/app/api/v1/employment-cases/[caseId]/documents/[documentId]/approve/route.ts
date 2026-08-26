import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseDocuments, documentApprovals } from "@/db/schema";

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string; documentId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att godkänna dokument.",
      });
    }

    const { caseId, documentId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { rationale?: string };
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
        rationale: body.rationale ?? "",
        decidedBy: actor.actorId,
        decidedAt: new Date(nowIso),
      });

      await db
        .update(caseDocuments)
        .set({ status: "approved", updatedAt: new Date(nowIso), version: doc.version + 1 })
        .where(and(eq(caseDocuments.tenantId, actor.tenantId), eq(caseDocuments.id, documentId)));
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof EmploymentCasesError) {
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message, details: err.details } },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

