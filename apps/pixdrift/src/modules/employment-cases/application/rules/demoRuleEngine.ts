import type { EmploymentCase } from "../../domain/employmentCase";
import type { CaseFact } from "../../domain/caseFact";

export type DemoRuleId =
  | "DEMO_REQUIRE_EMPLOYMENT_TYPE"
  | "DEMO_REQUIRE_EMPLOYEE_RESPONSE"
  | "DEMO_REQUIRE_COLLECTIVE_AGREEMENT_CHECK";

export type RuleOutcome =
  | {
      type: "blocker";
      ruleId: DemoRuleId;
      blockerKey: string;
      messageKey: string;
      missingFactKeys: string[];
    }
  | {
      type: "passed";
      ruleId: DemoRuleId;
    };

export function evaluateDemoRules(input: {
  case: EmploymentCase;
  facts: CaseFact[];
}): RuleOutcome[] {
  const factIndex = new Map<string, CaseFact[]>();
  for (const f of input.facts) {
    const list = factIndex.get(f.key) ?? [];
    list.push(f);
    factIndex.set(f.key, list);
  }

  const isConfirmed = (key: string) => {
    const facts = factIndex.get(key) ?? [];
    return facts.some((f) => f.status === "accepted" || f.status === "corroborated");
  };

  const outcomes: RuleOutcome[] = [];

  if (!isConfirmed("employment.type")) {
    outcomes.push({
      type: "blocker",
      ruleId: "DEMO_REQUIRE_EMPLOYMENT_TYPE",
      blockerKey: "employment_context_missing_employment_type",
      messageKey: "rules.demo.requireEmploymentType",
      missingFactKeys: ["employment.type"],
    });
  } else {
    outcomes.push({ type: "passed", ruleId: "DEMO_REQUIRE_EMPLOYMENT_TYPE" });
  }

  if (!isConfirmed("collective_agreement.checked")) {
    outcomes.push({
      type: "blocker",
      ruleId: "DEMO_REQUIRE_COLLECTIVE_AGREEMENT_CHECK",
      blockerKey: "employment_context_collective_agreement_unchecked",
      messageKey: "rules.demo.requireCollectiveAgreementCheck",
      missingFactKeys: ["collective_agreement.checked"],
    });
  } else {
    outcomes.push({ type: "passed", ruleId: "DEMO_REQUIRE_COLLECTIVE_AGREEMENT_CHECK" });
  }

  if (!isConfirmed("employee.response_received")) {
    outcomes.push({
      type: "blocker",
      ruleId: "DEMO_REQUIRE_EMPLOYEE_RESPONSE",
      blockerKey: "employee_response_missing",
      messageKey: "rules.demo.requireEmployeeResponse",
      missingFactKeys: ["employee.response_received"],
    });
  } else {
    outcomes.push({ type: "passed", ruleId: "DEMO_REQUIRE_EMPLOYEE_RESPONSE" });
  }

  return outcomes;
}

