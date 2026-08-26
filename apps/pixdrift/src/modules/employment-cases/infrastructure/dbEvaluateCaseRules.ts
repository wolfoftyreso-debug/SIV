import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { withTenantTx } from "@/core/tenantTx";
import { caseBlockers, caseFacts, employmentCases } from "@/db/schema";
import type { EmploymentCase } from "../domain/employmentCase";
import type { CaseFact } from "../domain/caseFact";
import { evaluateDemoRules } from "../application/rules/demoRuleEngine";

function mapCaseRow(row: typeof employmentCases.$inferSelect): EmploymentCase {
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

function mapFactRow(row: typeof caseFacts.$inferSelect): CaseFact {
  return {
    id: row.id,
    tenantId: row.tenantId,
    caseId: row.caseId,
    key: row.key,
    value: row.value,
    valueType: row.valueType as CaseFact["valueType"],
    status: row.status,
    confidenceSource: row.confidenceSource as CaseFact["confidenceSource"],
    sourceReferences: (row.sourceReferences ?? []) as CaseFact["sourceReferences"],
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    reviewedBy: row.reviewedBy ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    supersedesFactId: row.supersedesFactId ?? null,
  };
}

export async function evaluateCaseRulesAndSyncBlockers(input: {
  tenantId: string;
  actorId: string;
  caseId: string;
  nowIso: string;
}) {
  return withTenantTx(input.tenantId, async (db) => {
    const cRow = (
      await db
        .select()
        .from(employmentCases)
        .where(and(eq(employmentCases.tenantId, input.tenantId), eq(employmentCases.id, input.caseId)))
        .limit(1)
    )[0];
    if (!cRow) return { ok: false as const, reason: "not_found" as const };

    const facts = (
      await db
        .select()
        .from(caseFacts)
        .where(and(eq(caseFacts.tenantId, input.tenantId), eq(caseFacts.caseId, input.caseId)))
    ).map(mapFactRow);

    const outcomes = evaluateDemoRules({ case: mapCaseRow(cRow), facts });
    const blockers = outcomes.filter((o) => o.type === "blocker");

    const existingActive = await db
      .select()
      .from(caseBlockers)
      .where(and(eq(caseBlockers.tenantId, input.tenantId), eq(caseBlockers.caseId, input.caseId), eq(caseBlockers.status, "active")));

    const newKeys = new Set(blockers.map((b) => b.blockerKey));
    const existingKeys = new Set(existingActive.map((b) => b.blockerKey));

    // Resolve blockers no longer active
    const toResolve = existingActive.filter((b) => !newKeys.has(b.blockerKey)).map((b) => b.id);
    if (toResolve.length > 0) {
      await db
        .update(caseBlockers)
        .set({
          status: "resolved",
          resolvedAt: new Date(input.nowIso),
          resolvedBy: input.actorId,
        })
        .where(and(eq(caseBlockers.tenantId, input.tenantId), inArray(caseBlockers.id, toResolve)));
    }

    // Insert new blockers
    const toInsert = blockers.filter((b) => !existingKeys.has(b.blockerKey));
    if (toInsert.length > 0) {
      await db.insert(caseBlockers).values(
        toInsert.map((b) => ({
          id: randomUUID(),
          tenantId: input.tenantId,
          caseId: input.caseId,
          blockerKey: b.blockerKey,
          status: "active",
          messageKey: b.messageKey,
          details: { ruleId: b.ruleId, missingFactKeys: b.missingFactKeys },
          createdAt: new Date(input.nowIso),
        }))
      );
    }

    return { ok: true as const, outcomes };
  });
}

