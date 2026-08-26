import { headers } from "next/headers";
import { EmploymentCasesError } from "@/modules/employment-cases";

export type ActorContext = {
  actorId: string;
  tenantId: string;
  roles: string[];
};

export async function requireActorContext(): Promise<ActorContext> {
  const h = await headers();
  const tenantId = h.get("x-dev-tenant-id") ?? process.env.DEV_TENANT_ID ?? "";
  const actorId = h.get("x-dev-actor-id") ?? process.env.DEV_ACTOR_ID ?? "";
  const rolesHeader = h.get("x-dev-roles") ?? process.env.DEV_ROLES ?? "tenant_owner";

  if (process.env.NODE_ENV === "production") {
    throw new EmploymentCasesError({
      code: "CASE_ACCESS_DENIED",
      httpStatus: 501,
      message:
        "Auth är inte konfigurerad i den här instansen. Konfigurera Pixdrifts Identity Core och ersätt dev-context.",
    });
  }

  if (!tenantId || !actorId) {
    throw new EmploymentCasesError({
      code: "TENANT_CONTEXT_REQUIRED",
      httpStatus: 401,
      message:
        "Dev tenant/actor saknas. Sätt headers x-dev-tenant-id och x-dev-actor-id eller env DEV_TENANT_ID/DEV_ACTOR_ID.",
    });
  }

  return {
    tenantId,
    actorId,
    roles: rolesHeader.split(",").map((r) => r.trim()).filter(Boolean),
  };
}

