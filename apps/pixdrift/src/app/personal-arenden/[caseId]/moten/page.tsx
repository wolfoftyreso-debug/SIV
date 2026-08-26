import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { requireActorContext } from "@/core/requestContext";
import { hasPermission } from "@/core/permissions";
import { getEmploymentCaseService } from "@/modules/employment-cases/infrastructure/serviceFactory";
import { withTenantTx } from "@/core/tenantTx";
import { caseMeetings, meetingParticipants } from "@/db/schema";
import { createMeetingAction, generateInvitationAction } from "./actions";

export const metadata = {
  title: "Möten | Pixdrift",
};

export default async function CaseMeetingsPage(props: { params: Promise<{ caseId: string }> }) {
  const actor = await requireActorContext();
  if (!hasPermission(actor.roles, "employment_cases.read")) notFound();

  const { caseId } = await props.params;
  const service = getEmploymentCaseService();
  const c = await service.getById(actor.tenantId, caseId);
  if (!c) notFound();

  const meetings =
    process.env.DATABASE_URL && process.env.EMPLOYMENT_CASES_DB_MODE !== "memory"
      ? await withTenantTx(actor.tenantId, async (db) => {
          const list = await db
            .select()
            .from(caseMeetings)
            .where(and(eq(caseMeetings.tenantId, actor.tenantId), eq(caseMeetings.caseId, caseId)))
            .orderBy(desc(caseMeetings.scheduledAt))
            .limit(50);

          const ids = list.map((m) => m.id);
          const participants = ids.length
            ? await db
                .select()
                .from(meetingParticipants)
                .where(and(eq(meetingParticipants.tenantId, actor.tenantId), eq(meetingParticipants.caseId, caseId)))
            : [];

          const byMeeting = new Map<string, typeof participants>();
          for (const p of participants) {
            const arr = byMeeting.get(p.meetingId) ?? [];
            arr.push(p);
            byMeeting.set(p.meetingId, arr);
          }

          return list.map((m) => ({ meeting: m, participants: byMeeting.get(m.id) ?? [] }));
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-600">{c.externalCaseNumber}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Möten</h1>
          <p className="mt-1 text-sm text-zinc-600">Skapa möte och generera kallelse → godkänn → skicka.</p>
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
        <span className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-900">Möten</span>
        <Link
          href={`/personal-arenden/${caseId}/kommunikation`}
          className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline"
        >
          Kommunikation
        </Link>
        <Link href={`/personal-arenden/${caseId}/dokument`} className="rounded-md px-3 py-1.5 text-zinc-700 hover:underline">
          Dokument
        </Link>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm font-medium text-zinc-900">Skapa möte</div>
          <form action={createMeetingAction} className="mt-4 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Mötestyp</span>
              <select name="meetingType" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
                <option value="initial_fact_finding">Utredande samtal</option>
                <option value="follow_up">Uppföljning</option>
                <option value="rehabilitation">Rehabilitering</option>
                <option value="formal_hearing">Formell hearing</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Titel</span>
              <input name="title" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue="Utredande samtal" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Syfte</span>
              <textarea name="purpose" rows={4} className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Tid (ISO)</span>
              <input
                name="scheduledAtIso"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="2026-08-26T14:00:00Z"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-700">Plats</span>
              <input name="location" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-medium text-zinc-700">Berörd arbetstagare (för kallelse)</div>
              <label className="mt-2 block">
                <span className="text-xs text-zinc-600">Namn</span>
                <input name="employeeName" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <label className="mt-2 block">
                <span className="text-xs text-zinc-600">E‑post (valfritt)</span>
                <input name="employeeEmail" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" placeholder="employee@example.com" />
              </label>
            </div>
            <button type="submit" className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800">
              Skapa möte
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-5">
            <div className="text-sm font-medium text-zinc-900">Möten</div>
            <p className="mt-1 text-sm text-zinc-600">{meetings.length} senaste</p>
          </div>
          {meetings.length === 0 ? (
            <div className="p-5 text-sm text-zinc-700">Inga möten än.</div>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {meetings.map(({ meeting, participants }) => (
                <li key={meeting.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{meeting.title}</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {meeting.meetingType} · {meeting.status} · {meeting.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}
                      </div>
                      {participants.length ? (
                        <div className="mt-2 text-xs text-zinc-700">
                          Deltagare: {participants.map((p) => p.participantName).join(", ")}
                        </div>
                      ) : null}
                    </div>
                    <form action={generateInvitationAction}>
                      <input type="hidden" name="caseId" value={caseId} />
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                      >
                        Skapa kallelse
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

