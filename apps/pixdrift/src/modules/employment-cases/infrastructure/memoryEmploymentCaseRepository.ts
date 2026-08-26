import type { EmploymentCaseRepository } from "../application/ports";
import type { EmploymentCase } from "../domain/employmentCase";

/**
 * Temporary dev-only repository to keep the module compilable
 * before the database layer is implemented.
 */
export class MemoryEmploymentCaseRepository implements EmploymentCaseRepository {
  private readonly cases = new Map<string, EmploymentCase>();

  async create(caseDraft: EmploymentCase): Promise<void> {
    this.cases.set(this.key(caseDraft.tenantId, caseDraft.id), caseDraft);
  }

  async getById(tenantId: string, caseId: string): Promise<EmploymentCase | null> {
    return this.cases.get(this.key(tenantId, caseId)) ?? null;
  }

  async listByTenant(
    tenantId: string,
    input?: { limit?: number; status?: EmploymentCase["status"] }
  ): Promise<EmploymentCase[]> {
    const all = [...this.cases.values()].filter((c) => c.tenantId === tenantId);
    const filtered = input?.status ? all.filter((c) => c.status === input.status) : all;
    const limit = input?.limit ?? 50;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async update(caseData: EmploymentCase): Promise<void> {
    this.cases.set(this.key(caseData.tenantId, caseData.id), caseData);
  }

  private key(tenantId: string, caseId: string) {
    return `${tenantId}:${caseId}`;
  }
}

