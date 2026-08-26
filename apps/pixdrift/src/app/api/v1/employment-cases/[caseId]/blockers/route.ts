import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseBlockers } from "@/db/schema";

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.read")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att läsa blockerare.",
      });
    }

    const { caseId } = await ctx.params;
    const blockers = await withTenantTx(actor.tenantId, async (db) => {
      return db
        .select()
        .from(caseBlockers)
        .where(and(eq(caseBlockers.tenantId, actor.tenantId), eq(caseBlockers.caseId, caseId), eq(caseBlockers.status, "active")));
    });

    return NextResponse.json({ ok: true, blockers }, { status: 200 });
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

