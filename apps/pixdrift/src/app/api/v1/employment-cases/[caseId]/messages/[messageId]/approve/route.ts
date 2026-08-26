import { NextResponse } from "next/server";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { approveOutboundDraft } from "@/modules/employment-cases/infrastructure/communications/communicationService";

export async function POST(_req: Request, ctx: { params: Promise<{ caseId: string; messageId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
    }
    const { caseId, messageId } = await ctx.params;

    const result = await approveOutboundDraft({
      tenantId: actor.tenantId,
      caseId,
      communicationId: messageId,
      actorId: actor.actorId,
    });

    if (!result.ok) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Meddelandet hittades inte." });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof EmploymentCasesError) {
      return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.httpStatus });
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

