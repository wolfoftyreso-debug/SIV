import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { EmploymentCasesError } from "@/modules/employment-cases";
import { withTenantTx } from "@/core/tenantTx";
import { caseMeetings, meetingParticipants } from "@/db/schema";

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const actor = await requireActorContext();
    if (!hasPermission(actor.roles, "employment_cases.read")) {
      throw new EmploymentCasesError({ code: "CASE_ACCESS_DENIED", httpStatus: 403, message: "Åtkomst nekad." });
    }
    const { caseId } = await ctx.params;

    const meetings = await withTenantTx(actor.tenantId, async (db) => {
      return db
        .select()
        .from(caseMeetings)
        .where(and(eq(caseMeetings.tenantId, actor.tenantId), eq(caseMeetings.caseId, caseId)))
        .orderBy(desc(caseMeetings.scheduledAt))
        .limit(50);
    });

    return NextResponse.json({ ok: true, meetings }, { status: 200 });
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
    const body = (await req.json()) as {
      meetingType: string;
      title: string;
      purpose: string;
      scheduledAtIso: string;
      location?: string;
      participants?: Array<{ name: string; email?: string; role: string }>;
    };

    const nowIso = new Date().toISOString();
    const id = randomUUID();

    await withTenantTx(actor.tenantId, async (db) => {
      await db.insert(caseMeetings).values({
        id,
        tenantId: actor.tenantId,
        caseId,
        meetingType: body.meetingType,
        title: body.title,
        purpose: body.purpose,
        scheduledAt: new Date(body.scheduledAtIso),
        location: body.location ?? null,
        status: "scheduled",
        createdBy: actor.actorId,
        createdAt: new Date(nowIso),
        updatedAt: new Date(nowIso),
        version: 1,
      });

      for (const p of body.participants ?? []) {
        await db.insert(meetingParticipants).values({
          id: randomUUID(),
          tenantId: actor.tenantId,
          caseId,
          meetingId: id,
          participantName: p.name,
          participantEmail: p.email ?? null,
          role: p.role,
        });
      }
    });

    return NextResponse.json({ ok: true, meetingId: id }, { status: 201 });
  } catch (err) {
    if (err instanceof EmploymentCasesError) {
      return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.httpStatus });
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

