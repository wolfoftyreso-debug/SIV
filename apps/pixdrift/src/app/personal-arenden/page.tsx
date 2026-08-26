import Link from "next/link";
import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";

export const metadata = {
  title: "Personalärenden | Pixdrift",
};

export default async function EmploymentCasesListPage() {
  const actor = await requireActorContext();
  const canRead = hasPermission(actor.roles, "employment_cases.read");

  const service = getEmploymentCaseService();
  const cases = canRead ? await service.list(actor.tenantId, { limit: 50 }) : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Personalärenden</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ärenden är tenant-isolerade och versionsstyrda.
          </p>
        </div>
        <Link
          href="/personal-arenden/nytt"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Nytt ärende
        </Link>
      </div>

      {!canRead ? (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-700">Du saknar behörighet att läsa personalärenden.</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-700">Inga ärenden än. Skapa ett nytt ärende för att köra första flödet.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-200">
            {cases.map((c) => (
              <li key={c.id} className="p-4">
                <Link href={`/personal-arenden/${c.id}`} className="block hover:underline">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{c.title}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {c.externalCaseNumber} · {c.status} · {c.phase}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600">v{c.version}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

