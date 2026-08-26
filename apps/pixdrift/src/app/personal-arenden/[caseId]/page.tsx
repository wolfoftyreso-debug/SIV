import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { withTenantTx } from "@/core/tenantTx";
import { caseBlockers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { evaluateEmploymentCaseRulesAction } from "../actions";

export const metadata = {
  title: "Personalärende | Pixdrift",
};

export default async function EmploymentCaseOverviewPage(props: { params: Promise<{ caseId: string }> }) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.read")) {
    notFound();
  }

  const { caseId } = await props.params;
  const service = getEmploymentCaseService();
  const c = await service.getById(actor.tenantId, caseId);
  if (!c) notFound();

  const blockers =
    process.env.DATABASE_URL && process.env.EMPLOYMENT_CASES_DB_MODE !== "memory"
      ? await withTenantTx(actor.tenantId, async (db) => {
          return db
            .select()
            .from(caseBlockers)
            .where(and(eq(caseBlockers.tenantId, actor.tenantId), eq(caseBlockers.caseId, caseId), eq(caseBlockers.status, "active")));
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-600">{c.externalCaseNumber}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{c.title}</h1>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-700">{c.description}</p>
        </div>
        <Link href="/personal-arenden" className="text-sm text-zinc-700 hover:underline">
          Tillbaka
        </Link>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/personal-arenden/${caseId}`}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-900"
        >
          Översikt
        </Link>
        <Link href={`/personal-arenden/${caseId}/tidslinje`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Tidslinje
        </Link>
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

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm font-medium text-zinc-900">Ärendets läge</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-600">Status</dt>
              <dd className="mt-1 font-medium">{c.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-600">Fas</dt>
              <dd className="mt-1 font-medium">{c.phase}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-600">Sekretessnivå</dt>
              <dd className="mt-1 font-medium">{c.confidentialityLevel}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-600">Version</dt>
              <dd className="mt-1 font-medium">v{c.version}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm font-medium text-zinc-900">Nästa steg</div>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            Nästa steg kommer från workflow + readiness + regelutfall. I nästa iteration kopplas detta till P0–P7 och
            blockerare.
          </p>
          <form action={evaluateEmploymentCaseRulesAction} className="mt-4">
            <input type="hidden" name="caseId" value={caseId} />
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Utvärdera regler (demo)
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-900">Blockerare</div>
            <p className="mt-1 text-sm text-zinc-600">
              Demo-blockerare (NOT_LEGALLY_REVIEWED) baserade på bekräftade fakta.
            </p>
          </div>
          <div className="text-xs text-zinc-600">{blockers.length} aktiva</div>
        </div>
        {blockers.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-700">Inga aktiva blockerare ännu.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {blockers.map((b) => (
              <li key={b.id} className="rounded-md border border-zinc-200 p-3">
                <div className="text-sm font-medium text-zinc-900">{b.messageKey}</div>
                <div className="mt-1 text-xs text-zinc-600">{b.blockerKey}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

