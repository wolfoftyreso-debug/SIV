import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __pixdriftSql: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sql =
    globalThis.__pixdriftSql ??
    postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require",
    });

  globalThis.__pixdriftSql = sql;
  return sql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}

