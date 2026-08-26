import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { withTenantTx } from "@/core/tenantTx";
import { caseDocuments } from "@/db/schema";

export const metadata = {
  title: "Dokument | Pixdrift",
};

export default async function CaseDocumentsPage(props: { params: Promise<{ caseId: string }> }) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.read")) notFound();

  const { caseId } = await props.params;
  const service = getEmploymentCaseService();
  const c = await service.getById(actor.tenantId, caseId);
  if (!c) notFound();

  const docs =
    process.env.DATABASE_URL && process.env.EMPLOYMENT_CASES_DB_MODE !== "memory"
      ? await withTenantTx(actor.tenantId, async (db) => {
          return db
            .select()
            .from(caseDocuments)
            .where(and(eq(caseDocuments.tenantId, actor.tenantId), eq(caseDocuments.caseId, caseId)))
            .orderBy(desc(caseDocuments.createdAt))
            .limit(50);
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-600">{c.externalCaseNumber}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Dokument</h1>
          <p className="mt-1 text-sm text-zinc-600">Versionerade dokument kopplade till ärendet.</p>
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
        <Link
          href={`/personal-arenden/${caseId}/kommunikation`}
          className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline"
        >
          Kommunikation
        </Link>
        <Link href={`/personal-arenden/${caseId}/moten`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Möten
        </Link>
        <span className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-900">Dokument</span>
      </nav>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white">
        {docs.length === 0 ? (
          <div className="p-6 text-sm text-zinc-700">Inga dokument än. (Nästa steg: skapa/godkänn/skicka från UI.)</div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {docs.map((d) => (
              <li key={d.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{d.templateKey}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      {d.status} · v{d.version}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600">{d.createdAt.toISOString().slice(0, 16).replace("T", " ")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

