import { randomUUID } from "node:crypto";
import type { DbTx } from "@/core/tenantTx";
import { documentTemplates, documentTemplateVersions } from "@/db/schema";
import { eq } from "drizzle-orm";

export type DemoTemplateKey = "meeting_invitation" | "meeting_notes" | "action_plan";

export type DemoTemplate = {
  key: DemoTemplateKey;
  title: string;
  html: string;
  variables: string[];
};

export const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    key: "meeting_invitation",
    title: "Kallelse",
    variables: [
      "employer_name",
      "employee_name",
      "meeting_title",
      "meeting_purpose",
      "meeting_date",
      "meeting_time",
      "meeting_location",
      "participants",
      "preparation_items",
      "response_contact",
    ],
    html: `<!doctype html>
<html lang="sv">
  <head><meta charset="utf-8"><title>Kallelse</title></head>
  <body style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h1 style="margin: 0 0 12px;">Kallelse: {{meeting_title}}</h1>
    <p><strong>Arbetsgivare:</strong> {{employer_name}}</p>
    <p><strong>Berörd arbetstagare:</strong> {{employee_name}}</p>
    <hr />
    <p><strong>Syfte</strong><br/>{{meeting_purpose}}</p>
    <p><strong>Tid</strong><br/>{{meeting_date}} kl. {{meeting_time}}</p>
    <p><strong>Plats</strong><br/>{{meeting_location}}</p>
    <p><strong>Deltagare</strong><br/>{{participants}}</p>
    <p><strong>Förberedelser</strong><br/>{{preparation_items}}</p>
    <p><strong>Kontakt</strong><br/>{{response_contact}}</p>
    <p style="color:#666;font-size:12px;margin-top:24px;">
      NOT_LEGALLY_REVIEWED – teknisk mall för första vertikala slicen.
    </p>
  </body>
</html>`,
  },
  {
    key: "meeting_notes",
    title: "Mötesanteckning",
    variables: ["meeting_title", "attendees", "purpose", "employer_summary", "employee_summary", "actions", "follow_up"],
    html: `<!doctype html>
<html lang="sv">
  <head><meta charset="utf-8"><title>Mötesanteckning</title></head>
  <body style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h1 style="margin: 0 0 12px;">Mötesanteckning: {{meeting_title}}</h1>
    <p><strong>Närvarande</strong><br/>{{attendees}}</p>
    <p><strong>Syfte</strong><br/>{{purpose}}</p>
    <h2>Arbetsgivarens beskrivning</h2>
    <p>{{employer_summary}}</p>
    <h2>Arbetstagarens beskrivning</h2>
    <p>{{employee_summary}}</p>
    <h2>Åtgärder</h2>
    <p>{{actions}}</p>
    <h2>Uppföljning</h2>
    <p>{{follow_up}}</p>
    <p style="color:#666;font-size:12px;margin-top:24px;">
      NOT_LEGALLY_REVIEWED – teknisk mall för första vertikala slicen.
    </p>
  </body>
</html>`,
  },
  {
    key: "action_plan",
    title: "Handlingsplan",
    variables: ["goal", "support", "measurement", "dates", "responsible", "notes"],
    html: `<!doctype html>
<html lang="sv">
  <head><meta charset="utf-8"><title>Handlingsplan</title></head>
  <body style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h1 style="margin: 0 0 12px;">Handlingsplan</h1>
    <h2>Vad behöver förändras?</h2>
    <p>{{goal}}</p>
    <h2>Vilket stöd ges?</h2>
    <p>{{support}}</p>
    <h2>Hur följs resultatet upp?</h2>
    <p>{{measurement}}</p>
    <h2>Vilka datum gäller?</h2>
    <p>{{dates}}</p>
    <h2>Vem ansvarar?</h2>
    <p>{{responsible}}</p>
    <h2>Kommentarer</h2>
    <p>{{notes}}</p>
    <p style="color:#666;font-size:12px;margin-top:24px;">
      NOT_LEGALLY_REVIEWED – teknisk mall för första vertikala slicen.
    </p>
  </body>
</html>`,
  },
];

export async function ensureDemoTemplates(db: DbTx) {
  for (const t of DEMO_TEMPLATES) {
    const existing = (await db.select().from(documentTemplates).where(eq(documentTemplates.key, t.key)).limit(1))[0];
    const templateId = existing?.id ?? randomUUID();

    if (!existing) {
      await db.insert(documentTemplates).values({
        id: templateId,
        key: t.key,
        title: t.title,
        status: "published",
        notLegallyReviewed: true,
        synthetic: true,
      });
    }

    const vExisting = (
      await db
        .select()
        .from(documentTemplateVersions)
        .where(eq(documentTemplateVersions.templateId, templateId))
        .limit(1)
    )[0];

    if (!vExisting) {
      await db.insert(documentTemplateVersions).values({
        id: randomUUID(),
        templateId,
        version: 1,
        status: "published",
        content: { variables: t.variables, html: t.html },
      });
    }
  }
}

export function renderDemoTemplate(templateKey: DemoTemplateKey, variables: Record<string, string>): string {
  const t = DEMO_TEMPLATES.find((x) => x.key === templateKey);
  if (!t) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  let html = t.html;
  for (const [k, v] of Object.entries(variables)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  // Any missing variables are left as-is, which is a clear signal for incomplete input.
  return html;
}

