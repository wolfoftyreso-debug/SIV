import { NextResponse } from "next/server";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { requireActorContext } from "@/core/requestContext";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { hasPermission } from "@/core/permissions";

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.read")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att läsa personalärenden.",
      });
    }

    const { caseId } = await ctx.params;
    const service = getEmploymentCaseService();
    const c = await service.getById(actor.tenantId, caseId);

    if (!c) {
      throw new EmploymentCasesError({ code: "CASE_NOT_FOUND", httpStatus: 404, message: "Ärendet hittades inte." });
    }

    return NextResponse.json({ ok: true, case: c }, { status: 200 });
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

export async function PATCH(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att ändra personalärenden.",
      });
    }

    const { caseId } = await ctx.params;
    const body = (await req.json()) as { expectedVersion: number; title?: string; description?: string };

    const service = getEmploymentCaseService();
    await service.updateDraft({
      tenantId: actor.tenantId,
      actorId: actor.actorId,
      caseId,
      expectedVersion: body.expectedVersion,
      title: body.title,
      description: body.description,
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

