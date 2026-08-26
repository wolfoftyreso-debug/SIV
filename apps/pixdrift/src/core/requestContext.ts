import { headers } from "next/headers";
import { EmploymentCasesError } from "@pia/employment-cases";
import { randomUUID } from "node:crypto";

export type ActorContext = {
  actorId: string;
  tenantId: string;
  roles: string[];
};

declare global {
  // eslint-disable-next-line no-var
  var __pixdriftDevContext: { tenantId: string; actorId: string } | undefined;
}

export async function requireActorContext(): Promise<ActorContext> {
  const h = await headers();
  let tenantId = h.get("x-dev-tenant-id") ?? process.env.DEV_TENANT_ID ?? "";
  let actorId = h.get("x-dev-actor-id") ?? process.env.DEV_ACTOR_ID ?? "";
  const rolesHeader = h.get("x-dev-roles") ?? process.env.DEV_ROLES ?? "tenant_owner";

  if (process.env.NODE_ENV === "production") {
    throw new EmploymentCasesError({
      code: "CASE_ACCESS_DENIED",
      httpStatus: 501,
      message:
        "Auth är inte konfigurerad i den här instansen. Konfigurera Pixdrifts Identity Core och ersätt dev-context.",
    });
  }

  if ((!tenantId || !actorId) && process.env.STRICT_DEV_CONTEXT !== "true") {
    const existing = globalThis.__pixdriftDevContext;
    if (existing) {
      tenantId = tenantId || existing.tenantId;
      actorId = actorId || existing.actorId;
    } else {
      const created = { tenantId: randomUUID(), actorId: randomUUID() };
      globalThis.__pixdriftDevContext = created;
      tenantId = tenantId || created.tenantId;
      actorId = actorId || created.actorId;
    }
  }

  if (!tenantId || !actorId) {
    throw new EmploymentCasesError({
      code: "TENANT_CONTEXT_REQUIRED",
      httpStatus: 401,
      message:
        "Dev tenant/actor saknas. Sätt headers x-dev-tenant-id och x-dev-actor-id eller env DEV_TENANT_ID/DEV_ACTOR_ID (eller slå av STRICT_DEV_CONTEXT).",
    });
  }

  return {
    tenantId,
    actorId,
    roles: rolesHeader.split(",").map((r) => r.trim()).filter(Boolean),
  };
}

