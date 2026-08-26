import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getTestEmailProvider } from "@/modules/employment-cases/infrastructure/email/emailProviderFactory";
import { withTenantTx } from "@/core/tenantTx";
import { caseEmailAliases } from "@/db/schema";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = (await req.json()) as {
    tenantId: string;
    caseId: string;
    from: string;
    subject: string;
    text: string;
    providerEmailId?: string;
  };

  const p = getTestEmailProvider();
  if (!p) return new NextResponse("Resend configured; seed not available", { status: 400 });

  const alias = await withTenantTx(body.tenantId, async (db) => {
    return (
      await db
        .select()
        .from(caseEmailAliases)
        .where(and(eq(caseEmailAliases.tenantId, body.tenantId), eq(caseEmailAliases.caseId, body.caseId), eq(caseEmailAliases.active, true)))
        .limit(1)
    )[0];
  });

  if (!alias) return new NextResponse("No alias for case yet", { status: 400 });

  const inbound = `${alias.aliasLocalPart}@${alias.inboundDomain}`;
  const providerEmailId = body.providerEmailId ?? randomUUID();

  p.seedReceivedEmail({
    provider: "resend",
    providerEmailId,
    from: body.from,
    to: [inbound],
    subject: body.subject,
    text: body.text,
    html: undefined,
    headers: { "x-test-seeded": "true" },
    attachments: [],
  });

  return NextResponse.json({ ok: true, providerEmailId, to: inbound }, { status: 201 });
}

