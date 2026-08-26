import { randomUUID } from "node:crypto";
import type {
  EmailProvider,
  OutboundEmail,
  ReceivedAttachment,
  ReceivedEmail,
  SendResult,
  VerifiedWebhookEvent,
} from "./emailProvider";

/**
 * Test provider for local/dev runs without external credentials.
 * It does NOT perform real delivery; it generates stable ids and echoes content.
 */
export class TestEmailProvider implements EmailProvider {
  private readonly inbox = new Map<string, ReceivedEmail>();

  seedReceivedEmail(email: ReceivedEmail) {
    this.inbox.set(email.providerEmailId, email);
  }

  async send(message: OutboundEmail): Promise<SendResult> {
    const providerMessageId = `test_${randomUUID()}`;
    return { provider: "test", providerMessageId, raw: { message, attachments: message.attachments?.length ?? 0 } };
  }

  async verifyWebhook(_headers: Headers, rawBody: string): Promise<VerifiedWebhookEvent> {
    const id = `test_${randomUUID()}`;
    try {
      const parsed = JSON.parse(rawBody);
      const type = String(parsed?.type ?? "email.received");
      const emailId = parsed?.data?.email_id ?? parsed?.data?.emailId;
      return {
        provider: "resend",
        type,
        id,
        timestamp: new Date().toISOString(),
        data: emailId ? { email_id: String(emailId) } : { rawBody },
      };
    } catch {
      return { provider: "resend", type: "email.received", id, timestamp: new Date().toISOString(), data: { rawBody } };
    }
  }

  async getReceivedEmail(providerEmailId: string): Promise<ReceivedEmail> {
    const found = this.inbox.get(providerEmailId);
    if (!found) {
      return {
        provider: "resend",
        providerEmailId,
        from: "test@example.com",
        to: [],
        subject: "(test email)",
        text: "",
        html: "",
        headers: {},
        attachments: [],
      };
    }
    return found;
  }

  async listReceivedAttachments(_providerEmailId: string): Promise<ReceivedEmail["attachments"]> {
    return [];
  }

  async getReceivedAttachment(_providerEmailId: string, _attachmentId: string): Promise<ReceivedAttachment> {
    return {
      filename: "test.txt",
      contentType: "text/plain",
      size: 0,
      bytes: new Uint8Array(),
    };
  }
}


