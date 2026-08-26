import { randomUUID, createHash } from "node:crypto";
import { and, eq, lte } from "drizzle-orm";

import { withTenantTx } from "@/core/tenantTx";
import { outboxEvents, outboxPayloads } from "@/db/schema";
import type { OutboxPayload, OutboxType } from "./outboxTypes";

export async function enqueueOutboxEvent(input: {
  tenantId: string;
  type: OutboxType;
  payload: OutboxPayload;
  idempotencyKey: string;
  correlationId?: string;
  nowIso: string;
}) {
  return withTenantTx(input.tenantId, async (db) => {
    const payloadId = randomUUID();
    await db.insert(outboxPayloads).values({
      id: payloadId,
      tenantId: input.tenantId,
      payload: input.payload as unknown as Record<string, unknown>,
    });

    await db.insert(outboxEvents).values({
      id: randomUUID(),
      tenantId: input.tenantId,
      type: input.type,
      payloadReference: payloadId,
      idempotencyKey: input.idempotencyKey,
      attempt: 0,
      maxAttempts: 10,
      status: "queued",
      nextAttemptAt: new Date(input.nowIso),
      lastErrorCode: null,
      correlationId: input.correlationId ?? null,
    });
  });
}

export async function tryClaimOutboxBatch(input: { tenantId: string; nowIso: string; limit: number }) {
  return withTenantTx(input.tenantId, async (db) => {
    const now = new Date(input.nowIso);

    const rows = await db
      .select()
      .from(outboxEvents)
      .where(
        and(eq(outboxEvents.tenantId, input.tenantId), eq(outboxEvents.status, "queued"), lte(outboxEvents.nextAttemptAt, now))
      )
      .limit(input.limit);

    if (rows.length === 0) return [];

    for (const r of rows) {
      await db
        .update(outboxEvents)
        .set({ status: "processing", attempt: r.attempt + 1 })
        .where(and(eq(outboxEvents.tenantId, input.tenantId), eq(outboxEvents.id, r.id)));
    }

    return rows;
  });
}

export async function loadOutboxPayload(tenantId: string, payloadId: string) {
  return withTenantTx(tenantId, async (db) => {
    const row = (await db.select().from(outboxPayloads).where(and(eq(outboxPayloads.tenantId, tenantId), eq(outboxPayloads.id, payloadId))).limit(1))[0];
    return row?.payload ?? null;
  });
}

export function hashPayload(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

