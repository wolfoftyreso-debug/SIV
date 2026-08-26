import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { withTenantTx } from "@/core/tenantTx";
import { caseBlockers, caseCommunications, caseDocuments, caseEvents } from "@/db/schema";

export const metadata = {
  title: "Tidslinje | Pixdrift",
};

type TimelineItem =
  | { type: "event"; at: string; title: string; detail: string }
  | { type: "blocker"; at: string; title: string; detail: string }
  | { type: "communication"; at: string; title: string; detail: string }
  | { type: "document"; at: string; title: string; detail: string };

export default async function CaseTimelinePage(props: { params: Promise<{ caseId: string }> }) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.read")) notFound();

  const { caseId } = await props.params;
  const service = getEmploymentCaseService();
  const c = await service.getById(actor.tenantId, caseId);
  if (!c) notFound();

  const items: TimelineItem[] =
    process.env.DATABASE_URL && process.env.EMPLOYMENT_CASES_DB_MODE !== "memory"
      ? await withTenantTx(actor.tenantId, async (db) => {
          const [events, blockers, comms, docs] = await Promise.all([
            db
              .select()
              .from(caseEvents)
              .where(and(eq(caseEvents.tenantId, actor.tenantId), eq(caseEvents.caseId, caseId)))
              .orderBy(desc(caseEvents.createdAt))
              .limit(50),
            db
              .select()
              .from(caseBlockers)
              .where(and(eq(caseBlockers.tenantId, actor.tenantId), eq(caseBlockers.caseId, caseId)))
              .orderBy(desc(caseBlockers.createdAt))
              .limit(50),
            db
              .select()
              .from(caseCommunications)
              .where(and(eq(caseCommunications.tenantId, actor.tenantId), eq(caseCommunications.caseId, caseId)))
              .orderBy(desc(caseCommunications.createdAt))
              .limit(50),
            db
              .select()
              .from(caseDocuments)
              .where(and(eq(caseDocuments.tenantId, actor.tenantId), eq(caseDocuments.caseId, caseId)))
              .orderBy(desc(caseDocuments.createdAt))
              .limit(50),
          ]);

          const merged: TimelineItem[] = [];

          for (const e of events) {
            merged.push({
              type: "event",
              at: e.createdAt.toISOString(),
              title: `Händelse: ${e.title}`,
              detail: e.eventType,
            });
          }
          for (const b of blockers) {
            merged.push({
              type: "blocker",
              at: b.createdAt.toISOString(),
              title: `Blockerare: ${b.messageKey}`,
              detail: b.status,
            });
          }
          for (const m of comms) {
            merged.push({
              type: "communication",
              at: m.createdAt.toISOString(),
              title: `${m.direction === "inbound" ? "Inkommande" : "Utgående"}: ${m.subject}`,
              detail: `${m.status}${m.provider ? ` · ${m.provider}` : ""}`,
            });
          }
          for (const d of docs) {
            merged.push({
              type: "document",
              at: d.createdAt.toISOString(),
              title: `Dokument: ${d.templateKey}`,
              detail: d.status,
            });
          }

          merged.sort((a, b) => b.at.localeCompare(a.at));
          return merged;
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-600">{c.externalCaseNumber}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Tidslinje</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Kombination av händelser, blockerare, dokument och kommunikation. (Audit och regelspår visas senare.)
          </p>
        </div>
        <Link href={`/personal-arenden/${caseId}`} className="text-sm text-zinc-700 hover:underline">
          Tillbaka
        </Link>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/personal-arenden/${caseId}`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Översikt
        </Link>
        <span className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-900">Tidslinje</span>
        <Link
          href={`/personal-arenden/${caseId}/kommunikation`}
          className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline"
        >
          Kommunikation
        </Link>
        <Link href={`/personal-arenden/${caseId}/moten`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Möten
        </Link>
        <Link href={`/personal-arenden/${caseId}/dokument`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Dokument
        </Link>
      </nav>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-zinc-700">Ingen tidslinjedata än.</div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {items.map((it, idx) => (
              <li key={`${it.type}:${it.at}:${idx}`} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{it.title}</div>
                    <div className="mt-1 text-xs text-zinc-600">{it.detail}</div>
                  </div>
                  <div className="text-xs text-zinc-600">{new Date(it.at).toLocaleString("sv-SE")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

