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
  const appDbPassword = process.env.PIXDRIFT_APP_DB_PASSWORD || "pixdrift_app_pw";

  const host = new URL(url).hostname;
  const ssl = host === "localhost" || host === "127.0.0.1" ? false : "require";
  const sql = postgres(url, { max: 1, ssl });
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

    // Ensure the app role can login in dev, so RLS is tested.
    await sql.unsafe(`alter role pixdrift_app password '${appDbPassword.replaceAll("'", "''")}'`);

    process.stdout.write("Dev bootstrap complete.\n\n");
    process.stdout.write("Add these environment variables for local dev:\n\n");
    process.stdout.write(`DEV_TENANT_ID=${tenantId}\n`);
    process.stdout.write(`DEV_ACTOR_ID=${actorId}\n`);
    process.stdout.write("DEV_ROLES=tenant_owner,case_admin\n");
    process.stdout.write("EMPLOYMENT_CASES_DB_MODE=postgres\n");
    process.stdout.write(`PIXDRIFT_APP_DB_PASSWORD=${appDbPassword}\n`);
    process.stdout.write("\nSuggested runtime DATABASE_URL (pixdrift_app):\n");
    try {
      const u = new URL(url);
      u.username = "pixdrift_app";
      u.password = appDbPassword;
      process.stdout.write(`DATABASE_URL=${u.toString()}\n`);
      if (host === "localhost" || host === "127.0.0.1") {
        process.stdout.write("DATABASE_SSL_MODE=disable\n");
      }
    } catch {
      // ignore
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

