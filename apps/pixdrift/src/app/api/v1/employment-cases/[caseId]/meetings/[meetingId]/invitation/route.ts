import { NextResponse } from "next/server";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { generateMeetingInvitationAndDraftEmail } from "@/modules/employment-cases/infrastructure/communications/communicationService";

export async function POST(_req: Request, ctx: { params: Promise<{ caseId: string; meetingId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
    }
    const { caseId, meetingId } = await ctx.params;

    const res = await generateMeetingInvitationAndDraftEmail({
      tenantId: actor.tenantId,
      caseId,
      meetingId,
      actorId: actor.actorId,
    });

    if (!res.ok) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Mötet hittades inte." });
    }

    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    if (err instanceof EmploymentCasesError) {
      return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.httpStatus });
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

