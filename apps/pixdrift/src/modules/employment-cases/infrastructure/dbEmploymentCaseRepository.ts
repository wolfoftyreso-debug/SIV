import { eq, and } from "drizzle-orm";
import type { EmploymentCaseRepository } from "../application/ports";
import type { EmploymentCase } from "../domain/employmentCase";
import { employmentCases } from "@/db/schema";
import { withTenantTx } from "@/core/tenantTx";

function mapRowToDomain(row: typeof employmentCases.$inferSelect): EmploymentCase {
  return {
    id: row.id,
    tenantId: row.tenantId,
    externalCaseNumber: row.externalCaseNumber,
    title: row.title,
    description: row.description,
    status: row.status,
    phase: row.phase,
    confidentialityLevel: row.confidentialityLevel,
    activeTracks: (row.activeTracks ?? []) as EmploymentCase["activeTracks"],
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

export class DbEmploymentCaseRepository implements EmploymentCaseRepository {
  async create(caseDraft: EmploymentCase): Promise<void> {
    await withTenantTx(caseDraft.tenantId, async (db) => {
      await db.insert(employmentCases).values({
        id: caseDraft.id,
        tenantId: caseDraft.tenantId,
        externalCaseNumber: caseDraft.externalCaseNumber,
        title: caseDraft.title,
        description: caseDraft.description,
        status: caseDraft.status,
        phase: caseDraft.phase,
        confidentialityLevel: caseDraft.confidentialityLevel,
        activeTracks: caseDraft.activeTracks as unknown[],
        createdBy: caseDraft.createdBy,
        createdAt: new Date(caseDraft.createdAt),
        updatedAt: new Date(caseDraft.updatedAt),
        version: caseDraft.version,
      });
    });
  }

  async getById(tenantId: string, caseId: string): Promise<EmploymentCase | null> {
    return withTenantTx(tenantId, async (db) => {
      const rows = await db
        .select()
        .from(employmentCases)
        .where(and(eq(employmentCases.tenantId, tenantId), eq(employmentCases.id, caseId)))
        .limit(1);

      const row = rows[0];
      return row ? mapRowToDomain(row) : null;
    });
  }

  async update(caseData: EmploymentCase): Promise<void> {
    await withTenantTx(caseData.tenantId, async (db) => {
      await db
        .update(employmentCases)
        .set({
          title: caseData.title,
          description: caseData.description,
          status: caseData.status,
          phase: caseData.phase,
          confidentialityLevel: caseData.confidentialityLevel,
          activeTracks: caseData.activeTracks as unknown[],
          updatedAt: new Date(caseData.updatedAt),
          version: caseData.version,
        })
        .where(and(eq(employmentCases.tenantId, caseData.tenantId), eq(employmentCases.id, caseData.id)));
    });
  }
}

