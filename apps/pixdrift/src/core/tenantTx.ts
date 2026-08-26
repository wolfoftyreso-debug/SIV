import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getSql } from "@/core/db";
import * as schema from "@/db/schema";

export type DbTx = PostgresJsDatabase<typeof schema>;

export async function withTenantTx<T>(tenantId: string, fn: (tx: DbTx) => Promise<T>): Promise<T> {
  const sql = getSql();

  // postgres.js transaction types don't exactly align with drizzle's public Sql type.
  // We keep the boundary here and expose a typed drizzle tx to callers.
  return (sql as unknown as { begin: (cb: (txSql: any) => Promise<T>) => Promise<T> }).begin(async (txSql) => {
    // Strict: missing tenant context should fail via RLS
    await txSql`set local app.tenant_id = ${tenantId}`;
    const txDb = drizzle(txSql as any, { schema });
    return fn(txDb);
  });
}

