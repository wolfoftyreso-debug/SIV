export type CreateEmploymentCaseDraftCommand = {
  tenantId: string;
  title: string;
  description: string;
  actorId: string;
};

export type UpdateEmploymentCaseDraftCommand = {
  tenantId: string;
  caseId: string;
  expectedVersion: number;
  title?: string;
  description?: string;
  actorId: string;
};

