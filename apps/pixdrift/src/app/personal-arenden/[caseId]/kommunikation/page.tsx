import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { withTenantTx } from "@/core/tenantTx";
import { caseCommunications } from "@/db/schema";
import { approveMessageAction, createMessageAction, sendMessageAction } from "./actions";

export const metadata = {
  title: "Kommunikation | Pixdrift",
};

export default async function CaseCommunicationPage(props: { params: Promise<{ caseId: string }> }) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.read")) notFound();

  const { caseId } = await props.params;
  const service = getEmploymentCaseService();
  const c = await service.getById(actor.tenantId, caseId);
  if (!c) notFound();

  const messages =
    process.env.DATABASE_URL && process.env.EMPLOYMENT_CASES_DB_MODE !== "memory"
      ? await withTenantTx(actor.tenantId, async (db) => {
          return db
            .select()
            .from(caseCommunications)
            .where(and(eq(caseCommunications.tenantId, actor.tenantId), eq(caseCommunications.caseId, caseId)))
            .orderBy(desc(caseCommunications.createdAt))
            .limit(50);
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-600">{c.externalCaseNumber}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Kommunikation</h1>
          <p className="mt-1 text-sm text-zinc-600">Utgående kräver godkännande innan köning. Inkommande kopplas via ärendeadress.</p>
        </div>
        <Link href={`/personal-arenden/${caseId}`} className="text-sm text-zinc-700 hover:underline">
          Tillbaka
        </Link>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/personal-arenden/${caseId}`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Översikt
        </Link>
        <Link href={`/personal-arenden/${caseId}/tidslinje`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Tidslinje
        </Link>
        <span className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-900">Kommunikation</span>
        <Link href={`/personal-arenden/${caseId}/dokument`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Dokument
        </Link>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm font-medium text-zinc-900">Nytt utgående meddelande</div>
          <form action={createMessageAction} className="mt-4 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Till (kommaseparerat)</span>
              <input
                name="to"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="employee@example.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Ämne</span>
              <input name="subject" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Text</span>
              <textarea name="bodyText" rows={6} className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Skapa utkast
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-5">
            <div className="text-sm font-medium text-zinc-900">Meddelanden</div>
            <p className="mt-1 text-sm text-zinc-600">{messages.length} senaste</p>
          </div>
          {messages.length === 0 ? (
            <div className="p-5 text-sm text-zinc-700">Inga meddelanden än.</div>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {messages.map((m) => (
                <li key={m.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{m.subject}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {m.direction} · {m.status}
                        {m.provider ? ` · ${m.provider}` : ""}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{m.bodyText}</div>
                    </div>
                    <div className="text-xs text-zinc-600">{m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</div>
                  </div>

                  {m.direction === "outbound" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={approveMessageAction}>
                        <input type="hidden" name="caseId" value={caseId} />
                        <input type="hidden" name="messageId" value={m.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                        >
                          Godkänn
                        </button>
                      </form>
                      <form action={sendMessageAction}>
                        <input type="hidden" name="caseId" value={caseId} />
                        <input type="hidden" name="messageId" value={m.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800"
                        >
                          Köa skickning
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

