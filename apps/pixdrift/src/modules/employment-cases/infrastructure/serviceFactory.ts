import { systemClock } from "@/core/clock";
import { defaultIdGenerator } from "@/core/ids";
import { EmploymentCaseService } from "../application/employmentCaseService";
import { MemoryEmploymentCaseRepository } from "./memoryEmploymentCaseRepository";

declare global {
  // eslint-disable-next-line no-var
  var __employmentCasesRepo: MemoryEmploymentCaseRepository | undefined;
}

export function getEmploymentCaseService(): EmploymentCaseService {
  const repo = globalThis.__employmentCasesRepo ?? new MemoryEmploymentCaseRepository();
  globalThis.__employmentCasesRepo = repo;

  return new EmploymentCaseService({
    repo,
    ids: defaultIdGenerator(),
    clock: systemClock(),
  });
}

