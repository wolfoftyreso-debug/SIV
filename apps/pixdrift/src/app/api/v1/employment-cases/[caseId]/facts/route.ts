import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseFacts } from "@/db/schema";

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.write")) {
      throw new EmploymentCasesError({
        code: "CASE_ACCESS_DENIED",
        httpStatus: 403,
        message: "Du saknar behörighet att uppdatera fakta i personalärenden.",
      });
    }

    const { caseId } = await ctx.params;
    const body = (await req.json()) as {
      key: string;
      value: unknown;
      valueType: "string" | "number" | "boolean" | "date" | "json";
      status?: "accepted" | "corroborated" | "alleged" | "proposed";
    };

    const nowIso = new Date().toISOString();

    await withTenantTx(actor.tenantId, async (db) => {
      await db.insert(caseFacts).values({
        id: randomUUID(),
        tenantId: actor.tenantId,
        caseId,
        key: body.key,
        value: body.value,
        valueType: body.valueType,
        status: body.status ?? "accepted",
        confidenceSource: "human",
        sourceReferences: [],
        effectiveFrom: null,
        effectiveTo: null,
        reviewedBy: actor.actorId,
        reviewedAt: new Date(nowIso),
        createdAt: new Date(nowIso),
        supersedesFactId: null,
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
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

