import type { EmailProvider } from "./emailProvider";
import { ResendEmailProvider } from "./resendEmailProvider";
import { TestEmailProvider } from "./testEmailProvider";

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET) {
    return new ResendEmailProvider({
      apiKey: process.env.RESEND_API_KEY,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
  }
  return new TestEmailProvider();
}

