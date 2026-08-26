import { NextResponse } from "next/server";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { requireActorContext } from "@/core/requestContext";
import { EmploymentCasesError } from "@pia/employment-cases";
import { hasPermission } from "@/core/permissions";

export async function GET() {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.read")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att läsa personalärenden.",
      });
    }

    const service = getEmploymentCaseService();
    const cases = await service.list(actor.tenantId, { limit: 50 });
    return NextResponse.json({ ok: true, cases }, { status: 200 });
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

export async function POST(req: Request) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att skapa personalärenden.",
      });
    }
    const body = (await req.json()) as { title?: string; description?: string };

    const title = (body.title ?? "").trim() || "Personalärende";
    const description = (body.description ?? "").trim();

    const service = getEmploymentCaseService();
    const result = await service.createDraft({
      tenantId: actor.tenantId,
      actorId: actor.actorId,
      title,
      description,
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

