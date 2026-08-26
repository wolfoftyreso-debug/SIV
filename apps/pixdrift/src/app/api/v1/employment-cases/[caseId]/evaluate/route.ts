import { NextResponse } from "next/server";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { evaluateCaseRulesAndSyncBlockers } from "@/modules/employment-cases/infrastructure/dbEvaluateCaseRules";

export async function POST(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att utvärdera regler för personalärenden.",
      });
    }

    const { caseId } = await ctx.params;
    const nowIso = new Date().toISOString();

    const result = await evaluateCaseRulesAndSyncBlockers({
      tenantId: actor.tenantId,
      actorId: actor.actorId,
      caseId,
      nowIso,
    });

    if (!result.ok) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Ärendet hittades inte." });
    }

    return NextResponse.json({ ok: true, outcomes: result.outcomes }, { status: 200 });
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

