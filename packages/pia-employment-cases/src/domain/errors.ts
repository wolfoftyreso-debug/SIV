export type EmploymentCasesErrorCode =
  | "TENANT_CONTEXT_REQUIRED"
  | "CASE_NOT_FOUND"
  | "CASE_ACCESS_DENIED"
  | "CASE_VERSION_CONFLICT"
  | "CASE_TRANSITION_NOT_ALLOWED"
  | "CASE_TRANSITION_BLOCKED"
  | "FACT_REQUIRES_REVIEW"
  | "DOCUMENT_NOT_APPROVED"
  | "COMMUNICATION_NOT_APPROVED"
  | "LEGAL_RULE_NOT_PUBLISHED";

export class EmploymentCasesError extends Error {
  readonly code: EmploymentCasesErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(input: {
    code: EmploymentCasesErrorCode;
    message: string;
    httpStatus?: number;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "EmploymentCasesError";
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.details = input.details;
  }
}

