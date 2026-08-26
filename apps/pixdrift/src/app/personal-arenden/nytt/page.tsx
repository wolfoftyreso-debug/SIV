import Link from "next/link";
import { createEmploymentCaseDraftAction } from "../actions";

export const metadata = {
  title: "Nytt personalärende | Pixdrift",
};

export default function NewEmploymentCasePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Nytt personalärende</h1>
        <Link href="/personal-arenden" className="text-sm text-zinc-700 hover:underline">
          Tillbaka
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          Steg 1 – <span className="font-medium">Vad har hänt?</span>
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          I nästa steg kopplas detta till kommando-flödet <code>CreateEmploymentCaseDraft</code> och ett
          tenant-isolerat utkast sparas efter varje steg.
        </p>

        <form action={createEmploymentCaseDraftAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-900">Neutral rubrik</span>
            <input
              name="title"
              className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Ex. Sen ankomst – återkommande"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-900">Beskrivning</span>
            <textarea
              name="description"
              className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              rows={6}
              placeholder="Beskriv vad som inte fungerar, utan juridiska slutsatser."
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Fortsätt
          </button>
        </form>
      </div>
    </div>
  );
}

