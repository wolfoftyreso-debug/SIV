import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { withTenantTx } from "@/core/tenantTx";
import { outboxEvents } from "@/db/schema";
import { tryClaimOutboxBatch, loadOutboxPayload } from "@/modules/employment-cases/infrastructure/outbox/outboxStore";
import { dispatchQueuedEmailSend, processInboundReceivedEmail } from "@/modules/employment-cases/infrastructure/communications/communicationService";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const tenantId = req.headers.get("x-tenant-id") ?? process.env.DEV_TENANT_ID ?? "";
  if (!tenantId) return new NextResponse("Missing tenant", { status: 400 });

  const nowIso = new Date().toISOString();
  const batch = await tryClaimOutboxBatch({ tenantId, nowIso, limit: 10 });
  if (batch.length === 0) return NextResponse.json({ ok: true, processed: 0 }, { status: 200 });

  let processed = 0;
  for (const evt of batch) {
    const payload = await loadOutboxPayload(tenantId, evt.payloadReference);
    try {
      if (evt.type === "email.send") {
        const res = await dispatchQueuedEmailSend({ tenantId, payload, nowIso });
        if (!res.ok) throw new Error("email.send failed");
      } else if (evt.type === "email.received") {
        const res = await processInboundReceivedEmail({ providerEmailId: String((payload as any)?.providerEmailId ?? ""), nowIso });
        if (!res.ok) throw new Error(`email.received failed: ${res.reason}`);
      }

      await withTenantTx(tenantId, async (db) => {
        await db.update(outboxEvents).set({ status: "done" }).where(and(eq(outboxEvents.tenantId, tenantId), eq(outboxEvents.id, evt.id)));
      });
      processed += 1;
    } catch (e: any) {
      const backoffSeconds = Math.min(60 * 60, 2 ** Math.min(10, evt.attempt) * 2);
      const next = new Date(Date.now() + backoffSeconds * 1000);

      await withTenantTx(tenantId, async (db) => {
        await db
          .update(outboxEvents)
          .set({
            status: evt.attempt >= evt.maxAttempts ? "dead_letter" : "queued",
            nextAttemptAt: evt.attempt >= evt.maxAttempts ? null : next,
            lastErrorCode: String(e?.message ?? "error").slice(0, 200),
          })
          .where(and(eq(outboxEvents.tenantId, tenantId), eq(outboxEvents.id, evt.id)));
      });
    }
  }

  return NextResponse.json({ ok: true, processed }, { status: 200 });
}

