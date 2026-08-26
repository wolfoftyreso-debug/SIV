import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseDocuments, caseDocumentVersions } from "@/db/schema";
import { ensureDemoTemplates, renderDemoTemplate, type DemoTemplateKey } from "@/modules/employment-cases/infrastructure/documents/demoTemplates";

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att skapa dokument.",
      });
    }

    const { caseId } = await ctx.params;
    const body = (await req.json()) as {
      templateKey: DemoTemplateKey;
      variables: Record<string, string>;
    };

    const nowIso = new Date().toISOString();

    const result = await withTenantTx(actor.tenantId, async (db) => {
      await ensureDemoTemplates(db);

      const docId = randomUUID();
      await db.insert(caseDocuments).values({
        id: docId,
        tenantId: actor.tenantId,
        caseId,
        templateKey: body.templateKey,
        status: "generated",
        createdBy: actor.actorId,
        createdAt: new Date(nowIso),
        updatedAt: new Date(nowIso),
        version: 1,
      });

      const html = renderDemoTemplate(body.templateKey, body.variables);
      await db.insert(caseDocumentVersions).values({
        id: randomUUID(),
        tenantId: actor.tenantId,
        caseId,
        documentId: docId,
        version: 1,
        html,
        pdfBlobPath: null,
        createdBy: actor.actorId,
        createdAt: new Date(nowIso),
      });

      return { documentId: docId };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
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

