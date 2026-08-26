import type { EmploymentCase } from "../domain/employmentCase";

export interface Clock {
  nowIso(): string;
}

export interface IdGenerator {
  uuid(): string;
  externalCaseNumber(nowIso: string): string;
}

export interface EmploymentCaseRepository {
  create(caseDraft: EmploymentCase): Promise<void>;
  getById(tenantId: string, caseId: string): Promise<EmploymentCase | null>;
  listByTenant(
    tenantId: string,
    input?: { limit?: number; status?: EmploymentCase["status"] }
  ): Promise<EmploymentCase[]>;
  update(caseData: EmploymentCase): Promise<void>;
}

