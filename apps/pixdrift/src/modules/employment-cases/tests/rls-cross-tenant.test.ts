import { describe, it, expect } from "vitest";
import { GenericContainer, Wait } from "testcontainers";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function applyMigrations(sql: ReturnType<typeof postgres>) {
  const migrationsDir = path.join(process.cwd(), "src", "db", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));

  await sql.begin(async (tx) => {
    await tx`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const applied = new Set((await tx<{ id: string }[]>`select id from schema_migrations`).map((r) => r.id));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sqlText = await readFile(path.join(migrationsDir, file), "utf8");
      await tx.unsafe(sqlText);
      await tx`insert into schema_migrations (id) values (${file})`;
    }
  });
}

describe("RLS tenant isolation", () => {
  it("denies cross-tenant reads for application role", async () => {
    let container: Awaited<ReturnType<GenericContainer["start"]>> | undefined;
    try {
      container = await new GenericContainer("postgres:16-alpine")
        .withEnvironment({
          POSTGRES_DB: "pixdrift",
          POSTGRES_USER: "pixdrift_admin",
          POSTGRES_PASSWORD: "pixdrift_admin_pw",
        })
        .withExposedPorts(5432)
        .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
        .start();
    } catch (e) {
      // If Docker isn't available in the environment, skip rather than failing the whole suite.
      return;
    }

    const adminUrl = `postgresql://pixdrift_admin:pixdrift_admin_pw@${container.getHost()}:${container.getMappedPort(
      5432
    )}/pixdrift`;
    const sqlAdmin = postgres(adminUrl, { max: 1 });

    try {
      await applyMigrations(sqlAdmin);

      // Ensure the app role can login for tests.
      await sqlAdmin.unsafe(`alter role pixdrift_app password 'pixdrift_app_pw'`);

      const tenantA = randomUUID();
      const tenantB = randomUUID();

      await sqlAdmin`insert into tenants (id, name, synthetic) values (${tenantA}, 'Tenant A', true)`;
      await sqlAdmin`insert into tenants (id, name, synthetic) values (${tenantB}, 'Tenant B', true)`;

      const caseA = randomUUID();
      const caseB = randomUUID();
      const now = new Date().toISOString();

      await sqlAdmin.unsafe(`
        insert into employment_cases
          (id, tenant_id, external_case_number, title, description, status, phase, confidentiality_level, active_tracks, created_by, created_at, updated_at, version)
        values
          ('${caseA}', '${tenantA}', 'PA-2026-AAAAAAA1', 'A', 'A', 'draft', 'intake', 'confidential', '[]', '${randomUUID()}', '${now}', '${now}', 1),
          ('${caseB}', '${tenantB}', 'PA-2026-BBBBBBB2', 'B', 'B', 'draft', 'intake', 'confidential', '[]', '${randomUUID()}', '${now}', '${now}', 1)
      `);

      const appUrl = adminUrl.replace("pixdrift_admin:pixdrift_admin_pw", "pixdrift_app:pixdrift_app_pw");
      const sqlApp = postgres(appUrl, { max: 1 });

      try {
        const visibleA = await sqlApp.begin(async (tx) => {
          await tx`set local app.tenant_id = ${tenantA}`;
          return tx<{ id: string }[]>`select id from employment_cases order by id`;
        });

        expect(visibleA.map((r) => r.id)).toEqual([caseA]);

        const crossRead = await sqlApp.begin(async (tx) => {
          await tx`set local app.tenant_id = ${tenantA}`;
          return tx<{ id: string }[]>`select id from employment_cases where id = ${caseB}`;
        });

        expect(crossRead).toEqual([]);
      } finally {
        await sqlApp.end({ timeout: 5 });
      }
    } finally {
      await sqlAdmin.end({ timeout: 5 });
      await container.stop();
    }
  });
});

