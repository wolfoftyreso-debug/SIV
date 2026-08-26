import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";

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
        </div>
      </div>
    </div>
  );
}

