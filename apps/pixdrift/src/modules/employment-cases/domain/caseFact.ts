import type { FactStatus, FactValueType } from "./types";

export type FactSourceReference = {
  type: "event" | "evidence" | "communication" | "document" | "system";
  id: string;
  note?: string;
};

export type CaseFact = {
  id: string;
  tenantId: string;
  caseId: string;
  key: string;
  value: unknown;
  valueType: FactValueType;
  status: FactStatus;
  confidenceSource: "human" | "document" | "system" | "ai_suggestion";
  sourceReferences: FactSourceReference[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  supersedesFactId: string | null;
};

