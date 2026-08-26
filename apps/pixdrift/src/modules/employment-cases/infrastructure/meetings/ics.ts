export function buildIcs(input: {
  uid: string;
  startUtc: Date;
  durationMinutes: number;
  summary: string;
  description?: string;
  location?: string;
  organizerEmail?: string;
  attendees?: Array<{ email: string; name?: string }>;
}): string {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replaceAll(".000", "")
      .replace("T", "T")
      .replace("Z", "Z");

  const dtStart = fmt(input.startUtc);
  const dtEnd = fmt(new Date(input.startUtc.getTime() + input.durationMinutes * 60_000));
  const dtStamp = fmt(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pixdrift//EmploymentCases//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(input.summary)}`,
  ];

  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);

  if (input.organizerEmail) {
    lines.push(`ORGANIZER:MAILTO:${input.organizerEmail}`);
  }

  for (const a of input.attendees ?? []) {
    if (!a.email) continue;
    const cn = a.name ? `;CN=${escapeParam(a.name)}` : "";
    lines.push(`ATTENDEE${cn}:MAILTO:${a.email}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeText(v: string) {
  return v.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function escapeParam(v: string) {
  return v.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll(";", "\\;");
}

