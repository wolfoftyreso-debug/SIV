import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getEmailProvider } from "@/modules/employment-cases/infrastructure/email/emailProviderFactory";
import { hashPayload } from "@/modules/employment-cases/infrastructure/outbox/outboxStore";
import { enqueueOutboxEvent } from "@/modules/employment-cases/infrastructure/outbox/outboxStore";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const payloadHash = hashPayload(rawBody);

  // Verify signature first (no DB touches for invalid data).
  const provider = getEmailProvider();
  let event;
  try {
    event = await provider.verifyWebhook(new Headers(req.headers), rawBody);
  } catch {
    return new NextResponse("Invalid webhook", { status: 400 });
  }

  // Dedupe by provider+svix-id.
  // NOTE: We may not have tenant context yet; store tenant_id as NULL until resolved in async processing.
  // Insert is done using the migration/admin role in many setups; in runtime with pixdrift_app, this table is still writable.
  // We create a minimal transaction without tenant context by using DATABASE_MIGRATION_URL if available.
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) return new NextResponse("No database configured", { status: 500 });

  // Because RLS requires tenant context, we insert webhook dedupe row with tenant_id NULL using the migration url (owner).
  // If only DATABASE_URL exists, RLS may block writes; in that case we still proceed without dedupe.
  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 1, ssl: "require" });
    try {
      await sql.begin(async (tx: any) => {
        const exists = await tx`
          select 1 from webhook_events
          where provider = ${event.provider} and external_event_id = ${event.id}
          limit 1
        `;
        if (exists.length > 0) return;

        await tx`
          insert into webhook_events (id, tenant_id, provider, external_event_id, event_type, payload_hash)
          values (${randomUUID()}, null, ${event.provider}, ${event.id}, ${event.type}, ${payloadHash})
        `;
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch {
    // best-effort dedupe
  }

  // Only handle inbound email receive events for now.
  if (event.type !== "email.received") {
    return new NextResponse("OK", { status: 200 });
  }

  const providerEmailId = String((event.data as any)?.email_id ?? (event.data as any)?.emailId ?? "");
  if (!providerEmailId) return new NextResponse("OK", { status: 200 });

  // Enqueue async processing. We don't know tenant yet; the worker will resolve via alias.
  // Use a synthetic tenant id placeholder is not possible; store under a configured platform tenant for now.
  // For this scaffold repo, we require DEV_TENANT_ID as the platform tenant for inbound processing.
  const platformTenantId = process.env.DEV_TENANT_ID;
  if (!platformTenantId) return new NextResponse("OK", { status: 200 });

  await enqueueOutboxEvent({
    tenantId: platformTenantId,
    type: "email.received",
    payload: { type: "email.received", provider: "resend", providerEmailId },
    idempotencyKey: `resend:email.received:${event.id}`,
    nowIso: new Date().toISOString(),
  });

  return new NextResponse("OK", { status: 200 });
}

