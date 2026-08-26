export type DataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "highly_confidential"
  | "special_category"
  | "criminal_allegation";

export type CaseStatus =
  | "draft"
  | "active"
  | "awaiting_employer_input"
  | "awaiting_employee_response"
  | "awaiting_external_response"
  | "awaiting_review"
  | "paused"
  | "blocked"
  | "escalated"
  | "resolved"
  | "closed"
  | "archived";

export type CasePhase =
  | "intake"
  | "employment_context"
  | "initial_assessment"
  | "fact_finding"
  | "employee_dialogue"
  | "corrective_action"
  | "rehabilitation_assessment"
  | "work_adjustment"
  | "follow_up"
  | "reassignment_assessment"
  | "union_process"
  | "formal_notice"
  | "formal_decision"
  | "exit_execution"
  | "dispute_management"
  | "resolution"
  | "closure";

export type LegalTrack =
  | "performance"
  | "misconduct"
  | "attendance"
  | "cooperation_conflict"
  | "health_rehabilitation"
  | "substance_dependency"
  | "work_environment"
  | "harassment"
  | "discrimination"
  | "whistleblowing"
  | "union_activity"
  | "parental_leave"
  | "probation"
  | "fixed_term"
  | "reassignment"
  | "redundancy"
  | "personal_reasons"
  | "summary_dismissal"
  | "mutual_separation"
  | "criminal_allegation"
  | "immediate_safety";

export type FactStatus =
  | "proposed"
  | "alleged"
  | "corroborated"
  | "accepted"
  | "disputed"
  | "withdrawn"
  | "inconclusive";

export type FactValueType = "string" | "number" | "boolean" | "date" | "json";

