import type { CreateEmploymentCaseDraftCommand, UpdateEmploymentCaseDraftCommand } from "./commands";
import type { Clock, EmploymentCaseRepository, IdGenerator } from "./ports";
import { createEmploymentCaseDraft, updateEmploymentCaseDraft } from "../domain/employmentCase";
import { EmploymentCasesError } from "../domain/errors";

export class EmploymentCaseService {
  constructor(
    private readonly deps: {
      repo: EmploymentCaseRepository;
      ids: IdGenerator;
      clock: Clock;
    }
  ) {}

  async createDraft(cmd: CreateEmploymentCaseDraftCommand): Promise<{ caseId: string }> {
    if (!cmd.tenantId) {
      throw new EmploymentCasesError({
        code: "TENANT_CONTEXT_REQUIRED",
        httpStatus: 400,
        message: "Tenant saknas.",
      });
    }

    const now = this.deps.clock.nowIso();
    const caseId = this.deps.ids.uuid();
    const externalCaseNumber = this.deps.ids.externalCaseNumber(now);

    const draft = createEmploymentCaseDraft({
      id: caseId,
      tenantId: cmd.tenantId,
      externalCaseNumber,
      title: cmd.title,
      description: cmd.description,
      createdBy: cmd.actorId,
      now,
    });

    await this.deps.repo.create(draft);

    return { caseId };
  }

  async updateDraft(cmd: UpdateEmploymentCaseDraftCommand): Promise<void> {
    const current = await this.deps.repo.getById(cmd.tenantId, cmd.caseId);
    if (!current) {
      throw new EmploymentCasesError({
        code: "CASE_NOT_FOUND",
        httpStatus: 404,
        message: "Ärendet hittades inte.",
      });
    }

    const updated = updateEmploymentCaseDraft(current, {
      expectedVersion: cmd.expectedVersion,
      title: cmd.title,
      description: cmd.description,
      now: this.deps.clock.nowIso(),
    });

    await this.deps.repo.update(updated);
  }
}

