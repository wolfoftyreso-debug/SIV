import { systemClock } from "@/core/clock";
import { defaultIdGenerator } from "@/core/ids";
import { EmploymentCaseService } from "../application/employmentCaseService";
import { MemoryEmploymentCaseRepository } from "./memoryEmploymentCaseRepository";
import { DbEmploymentCaseRepository } from "./dbEmploymentCaseRepository";

declare global {
  // eslint-disable-next-line no-var
  var __employmentCasesRepo: MemoryEmploymentCaseRepository | undefined;
}

export function getEmploymentCaseService(): EmploymentCaseService {
  const repo =
    process.env.DATABASE_URL && process.env.EMPLOYMENT_CASES_DB_MODE !== "memory"
      ? new DbEmploymentCaseRepository()
      : (globalThis.__employmentCasesRepo ?? new MemoryEmploymentCaseRepository());
  if (repo instanceof MemoryEmploymentCaseRepository) {
    globalThis.__employmentCasesRepo = repo;
  }

  return new EmploymentCaseService({
    repo,
    ids: defaultIdGenerator(),
    clock: systemClock(),
  });
}

