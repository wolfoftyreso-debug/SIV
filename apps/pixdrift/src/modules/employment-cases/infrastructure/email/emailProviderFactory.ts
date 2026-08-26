import type { EmailProvider } from "./emailProvider";
import { ResendEmailProvider } from "./resendEmailProvider";
import { TestEmailProvider } from "./testEmailProvider";

declare global {
  // eslint-disable-next-line no-var
  var __piaTestEmailProvider: TestEmailProvider | undefined;
}

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET) {
    return new ResendEmailProvider({
      apiKey: process.env.RESEND_API_KEY,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
  }
  const p = globalThis.__piaTestEmailProvider ?? new TestEmailProvider();
  globalThis.__piaTestEmailProvider = p;
  return p;
}

export function getTestEmailProvider(): TestEmailProvider | null {
  return process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET ? null : (getEmailProvider() as TestEmailProvider);
}

