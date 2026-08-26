import { Webhook } from "svix";

import type {
  EmailProvider,
  OutboundEmail,
  ReceivedAttachment,
  ReceivedEmail,
  SendResult,
  VerifiedWebhookEvent,
} from "./emailProvider";

type ResendWebhookEnvelope = {
  type: string;
  created_at: string;
  data: Record<string, unknown>;
};

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly deps: {
      apiKey: string;
      webhookSecret: string;
    }
  ) {}

  async send(message: OutboundEmail): Promise<SendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.deps.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: message.replyTo,
        headers: message.headers,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${JSON.stringify(json)}`);
    }

    const providerMessageId = String(json?.data?.id ?? json?.id ?? "");
    return { provider: "resend", providerMessageId, raw: json };
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<VerifiedWebhookEvent> {
    const id = headers.get("svix-id") ?? "";
    const timestamp = headers.get("svix-timestamp") ?? "";
    const signature = headers.get("svix-signature") ?? "";
    if (!id || !timestamp || !signature) {
      throw new Error("Missing Svix headers");
    }

    const wh = new Webhook(this.deps.webhookSecret);
    const event = wh.verify(rawBody, {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    }) as ResendWebhookEnvelope;

    return {
      provider: "resend",
      type: event.type,
      id,
      timestamp,
      data: event.data ?? {},
    };
  }

  async getReceivedEmail(providerEmailId: string): Promise<ReceivedEmail> {
    const res = await fetch(`https://api.resend.com/emails/receiving/${providerEmailId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.deps.apiKey}`,
      },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(`Resend receiving.get failed: ${res.status} ${JSON.stringify(json)}`);
    }

    const data = json?.data ?? json;
    return {
      provider: "resend",
      providerEmailId,
      from: String(data?.from ?? ""),
      to: (data?.to ?? []).map(String),
      subject: String(data?.subject ?? ""),
      text: data?.text ? String(data.text) : undefined,
      html: data?.html ? String(data.html) : undefined,
      headers: data?.headers ?? undefined,
      attachments: [],
    };
  }

  async listReceivedAttachments(providerEmailId: string): Promise<ReceivedEmail["attachments"]> {
    const res = await fetch(`https://api.resend.com/emails/receiving/${providerEmailId}/attachments`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.deps.apiKey}` },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(`Resend receiving.attachments.list failed: ${res.status} ${JSON.stringify(json)}`);
    }

    const list = json?.data ?? [];
    return list.map((a: any) => ({
      id: String(a.id),
      filename: String(a.filename ?? "attachment"),
      size: Number(a.size ?? 0),
      contentType: String(a.content_type ?? a.contentType ?? "application/octet-stream"),
      downloadUrl: a.download_url ? String(a.download_url) : undefined,
      expiresAt: a.expires_at ? String(a.expires_at) : undefined,
    }));
  }

  async getReceivedAttachment(providerEmailId: string, attachmentId: string): Promise<ReceivedAttachment> {
    // Get attachment metadata + download_url
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${providerEmailId}/attachments/${attachmentId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.deps.apiKey}` },
      }
    );
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(`Resend receiving.attachments.get failed: ${res.status} ${JSON.stringify(json)}`);
    }

    const data = json?.data ?? json;
    const downloadUrl = String(data?.download_url ?? "");
    if (!downloadUrl) {
      throw new Error("Missing download_url for attachment");
    }

    const dl = await fetch(downloadUrl);
    if (!dl.ok) {
      throw new Error(`Download attachment failed: ${dl.status}`);
    }

    const buffer = new Uint8Array(await dl.arrayBuffer());
    return {
      filename: String(data?.filename ?? "attachment"),
      contentType: String(data?.content_type ?? "application/octet-stream"),
      size: Number(data?.size ?? buffer.byteLength),
      bytes: buffer,
    };
  }
}

