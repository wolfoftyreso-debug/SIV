import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

type MigrationRow = { id: string };

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const migrationsDir = path.join(process.cwd(), "src", "db", "migrations");

  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required to run migrations");
  }

  const host = new URL(url).hostname;
  const ssl = host === "localhost" || host === "127.0.0.1" ? false : "require";
  const sql = postgres(url, { max: 1, ssl });

  try {
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b, "en"));

    await sql.begin(async (tx) => {
      // Ensure migrations table exists (in case 001 isn't first for some reason)
      await tx`
        create table if not exists schema_migrations (
          id text primary key,
          applied_at timestamptz not null default now()
        )
      `;

      const applied = new Set(
        (await tx<MigrationRow[]>`select id from schema_migrations`).map((r) => r.id)
      );

      for (const file of files) {
        if (applied.has(file)) continue;

        const fullPath = path.join(migrationsDir, file);
        const sqlText = await readFile(fullPath, "utf8");

        process.stdout.write(`Applying ${file}${dryRun ? " (dry-run)" : ""}...\n`);
        if (!dryRun) {
          // postgres.js doesn't accept multi-statement sql tagged template well; use unsafe
          await tx.unsafe(sqlText);
          await tx`insert into schema_migrations (id) values (${file})`;
        }
      }
    });

    process.stdout.write("Migrations complete.\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

