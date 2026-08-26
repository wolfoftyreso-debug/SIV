import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-20 font-sans text-zinc-950">
      <main className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Pixdrift</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Intern utvecklingsmiljö. Gå vidare till modulen <span className="font-medium">Personalärenden</span>.
        </p>
        <div className="mt-6">
          <Link
            href="/personal-arenden"
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Öppna Personalärenden
          </Link>
        </div>
      </main>
    </div>
  );
}
