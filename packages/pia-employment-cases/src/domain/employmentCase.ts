import type { CasePhase, CaseStatus, DataClassification, LegalTrack } from "./types";
import { EmploymentCasesError } from "./errors";

export type EmploymentCaseId = string;

export type EmploymentCase = {
  id: EmploymentCaseId;
  tenantId: string;
  externalCaseNumber: string;
  title: string;
  description: string;
  status: CaseStatus;
  phase: CasePhase;
  confidentialityLevel: DataClassification;
  activeTracks: Array<{
    track: LegalTrack;
    status: "active" | "inactive";
    activatedAt: string;
    activatedBy: string;
    activationReason: string;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export function createEmploymentCaseDraft(input: {
  id: EmploymentCaseId;
  tenantId: string;
  externalCaseNumber: string;
  title: string;
  description: string;
  createdBy: string;
  now: string;
}): EmploymentCase {
  return {
    id: input.id,
    tenantId: input.tenantId,
    externalCaseNumber: input.externalCaseNumber,
    title: input.title,
    description: input.description,
    status: "draft",
    phase: "intake",
    confidentialityLevel: "confidential",
    activeTracks: [],
    createdBy: input.createdBy,
    createdAt: input.now,
    updatedAt: input.now,
    version: 1,
  };
}

export function updateEmploymentCaseDraft(
  current: EmploymentCase,
  input: {
    expectedVersion: number;
    title?: string;
    description?: string;
    now: string;
  }
): EmploymentCase {
  if (current.status !== "draft") {
    throw new EmploymentCasesError({
      code: "CASE_TRANSITION_NOT_ALLOWED",
      httpStatus: 409,
      message: "Ärendet är inte längre ett utkast.",
    });
  }

  if (current.version !== input.expectedVersion) {
    throw new EmploymentCasesError({
      code: "CASE_VERSION_CONFLICT",
      httpStatus: 409,
      message: "Ärendet har ändrats av någon annan. Hämta senaste versionen och försök igen.",
      details: { expected: input.expectedVersion, actual: current.version },
    });
  }

  return {
    ...current,
    title: input.title ?? current.title,
    description: input.description ?? current.description,
    updatedAt: input.now,
    version: current.version + 1,
  };
}

