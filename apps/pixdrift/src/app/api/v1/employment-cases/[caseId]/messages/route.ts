import { NextResponse } from "next/server";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { createOutboundDraft } from "@/modules/employment-cases/infrastructure/communications/communicationService";
import { withTenantTx } from "@/core/tenantTx";
import { and, eq, desc } from "drizzle-orm";
import { caseCommunications } from "@/db/schema";

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.read")) {
      throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
    }
    const { caseId } = await ctx.params;

    const items = await withTenantTx(actor.tenantId, async (db) => {
      return db
        .select()
        .from(caseCommunications)
        .where(and(eq(caseCommunications.tenantId, actor.tenantId), eq(caseCommunications.caseId, caseId)))
        .orderBy(desc(caseCommunications.createdAt))
        .limit(50);
    });

    return NextResponse.json({ ok: true, messages: items }, { status: 200 });
  } catch (err) {
    if (err instanceof EmploymentCasesError) {
      return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.httpStatus });
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
    }
    const { caseId } = await ctx.params;
    const body = (await req.json()) as { subject: string; bodyText: string; to: string[] };

    const result = await createOutboundDraft({
      tenantId: actor.tenantId,
      caseId,
      actorId: actor.actorId,
      subject: body.subject,
      bodyText: body.bodyText,
      to: body.to,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof EmploymentCasesError) {
      return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.httpStatus });
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

