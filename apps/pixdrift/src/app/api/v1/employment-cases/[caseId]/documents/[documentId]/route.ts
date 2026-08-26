import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseDocuments, caseDocumentVersions } from "@/db/schema";

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string; documentId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.read")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att läsa dokument.",
      });
    }

    const { caseId, documentId } = await ctx.params;

    const result = await withTenantTx(actor.tenantId, async (db) => {
      const doc = (
        await db
          .select()
          .from(caseDocuments)
          .where(and(eq(caseDocuments.tenantId, actor.tenantId), eq(caseDocuments.caseId, caseId), eq(caseDocuments.id, documentId)))
          .limit(1)
      )[0];
      if (!doc) return null;

      const latest = (
        await db
          .select()
          .from(caseDocumentVersions)
          .where(and(eq(caseDocumentVersions.tenantId, actor.tenantId), eq(caseDocumentVersions.documentId, documentId)))
          .orderBy(desc(caseDocumentVersions.version))
          .limit(1)
      )[0];

      return { doc, latest };
    });

    if (!result) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Dokumentet hittades inte." });
    }

    return NextResponse.json({ ok: true, document: result.doc, latestVersion: result.latest }, { status: 200 });
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

