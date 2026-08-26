import type { DataClassification } from "./types";

export type CaseEventType =
  | "attendance_deviation"
  | "absence"
  | "performance_deviation"
  | "quality_failure"
  | "instruction_given"
  | "instruction_not_followed"
  | "customer_complaint"
  | "work_refusal"
  | "conflict"
  | "inappropriate_conduct"
  | "policy_violation"
  | "safety_incident"
  | "health_information_received"
  | "rehabilitation_signal"
  | "work_adjustment_request"
  | "harassment_report"
  | "discrimination_report"
  | "whistleblowing_report"
  | "union_contact"
  | "meeting_held"
  | "warning_or_notice_given"
  | "employee_response_received"
  | "document_received"
  | "external_advice_received"
  | "other";

export type VerificationStatus = "unverified" | "verified" | "inconclusive";
export type DisputedStatus = "not_disputed" | "disputed" | "resolved";
export type SourceType = "human" | "document" | "system" | "email" | "ai_suggestion";

export type CaseEvent = {
  id: string;
  tenantId: string;
  caseId: string;
  eventType: CaseEventType;
  title: string;
  description: string;
  occurredAt: string | null;
  occurredDatePrecision: "exact" | "estimated" | "range" | "unknown";
  employerKnowledgeAt: string | null;
  location: string | null;
  sourceType: SourceType;
  sourceActorId: string | null;
  verificationStatus: VerificationStatus;
  disputedStatus: DisputedStatus;
  confidentialityLevel: DataClassification;
  createdBy: string;
  createdAt: string;
  version: number;
};

