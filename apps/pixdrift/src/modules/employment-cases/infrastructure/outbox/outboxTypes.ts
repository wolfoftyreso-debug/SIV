export type OutboxType = "email.send" | "email.received";

export type OutboxPayload =
  | {
      type: "email.send";
      tenantId: string;
      caseId: string;
      communicationId: string;
    }
  | {
      type: "email.received";
      tenantId?: string;
      provider: "resend";
      providerEmailId: string;
    };

