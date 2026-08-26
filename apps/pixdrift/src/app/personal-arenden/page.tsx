import Link from "next/link";

export const metadata = {
  title: "Personalärenden | Pixdrift",
};

export default async function EmploymentCasesListPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Personalärenden</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ärenden är tenant-isolerade och versionsstyrda. Den här sidan kopplas till databasen i nästa steg.
          </p>
        </div>
        <Link
          href="/personal-arenden/nytt"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Nytt ärende
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          Inga ärenden än. Skapa ett nytt ärende för att köra första vertikala flödet.
        </p>
      </div>
    </div>
  );
}

