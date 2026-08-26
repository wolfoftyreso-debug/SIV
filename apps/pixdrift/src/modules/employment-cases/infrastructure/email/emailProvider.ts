export type OutboundEmail = {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type SendResult = {
  provider: "resend" | "test";
  providerMessageId: string;
  raw?: Record<string, unknown>;
};

export type ReceivedEmail = {
  provider: "resend";
  providerEmailId: string;
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
    downloadUrl?: string;
    expiresAt?: string;
  }>;
};

export type ReceivedAttachment = {
  filename: string;
  contentType: string;
  size: number;
  bytes: Uint8Array;
};

export type VerifiedWebhookEvent = {
  provider: "resend";
  type: string;
  id: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export interface EmailProvider {
  send(message: OutboundEmail): Promise<SendResult>;
  getReceivedEmail(providerEmailId: string): Promise<ReceivedEmail>;
  listReceivedAttachments(providerEmailId: string): Promise<ReceivedEmail["attachments"]>;
  getReceivedAttachment(providerEmailId: string, attachmentId: string): Promise<ReceivedAttachment>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<VerifiedWebhookEvent>;
}

