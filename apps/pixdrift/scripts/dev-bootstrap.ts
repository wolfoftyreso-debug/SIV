import { randomUUID } from "node:crypto";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) {
    process.stdout.write("No DATABASE_MIGRATION_URL/DATABASE_URL set; skipping bootstrap.\n");
    return;
  }

  const tenantId = process.env.DEV_TENANT_ID || randomUUID();
  const actorId = process.env.DEV_ACTOR_ID || randomUUID();

  const sql = postgres(url, { max: 1, ssl: "require" });
  try {
    // Tenants / users are part of 001 migration; we keep bootstrap idempotent.
    await sql.begin(async (tx) => {
      await tx`
        insert into tenants (id, name, synthetic)
        values (${tenantId}, 'Dev tenant', true)
        on conflict (id) do nothing
      `;

      await tx`
        insert into users (id, tenant_id, email, display_name, roles, synthetic)
        values (${actorId}, ${tenantId}, 'dev@pixdrift.local', 'Dev user', ${JSON.stringify([
          "tenant_owner",
          "case_admin",
        ])}::jsonb, true)
        on conflict (id) do nothing
      `;
    });

    process.stdout.write("Dev bootstrap complete.\n\n");
    process.stdout.write("Add these environment variables for local dev:\n\n");
    process.stdout.write(`DEV_TENANT_ID=${tenantId}\n`);
    process.stdout.write(`DEV_ACTOR_ID=${actorId}\n`);
    process.stdout.write("DEV_ROLES=tenant_owner,case_admin\n");
    process.stdout.write("EMPLOYMENT_CASES_DB_MODE=postgres\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

