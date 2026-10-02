import { getWaitlistOverview } from "@housemate/core/db";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { serverDb } from "@/lib/server-context";
import { WaitlistView, type WaitlistRow } from "./waitlist-view";

export const metadata: Metadata = { title: "Waitlist" };

// Always read fresh: someone let in a moment ago must show.
export const dynamic = "force-dynamic";

/**
 * Who's waiting to join the pilot, and letting them in (D-072). Built from
 * the approved board O5, Paper page "Ops".
 */
export default async function WaitlistPage() {
  await requireStaff();
  const overview = await getWaitlistOverview(serverDb(), new Date());

  const rows: WaitlistRow[] = overview.waitlist.map((entry) => ({
    signupId: entry.signupId,
    email: entry.email,
    name: entry.name,
    addedOnOps: entry.addedOnOps,
    home: entry.home,
    joinedAt: entry.joinedAt.toISOString(),
    letIn: entry.letIn,
    link: entry.link
      ? { ...entry.link, expiresAt: entry.link.expiresAt.toISOString() }
      : null,
  }));

  return (
    <WaitlistView
      rows={rows}
      figures={
        <dl className="flex h-[110px] gap-1 rounded-lg bg-nav p-1">
          <Figure
            label="Pilot places left"
            value={`${overview.placesLeft} of ${overview.cap}`}
          />
          <Figure label="On the waitlist" value={String(rows.length)} />
          <Figure
            label="Let in, not joined yet"
            value={String(overview.letInNotJoined)}
          />
        </dl>
      }
    />
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-1.5 px-5">
      <dt className="text-sm font-normal text-muted">{label}</dt>
      <dd className="text-metric text-evergreen">{value}</dd>
    </div>
  );
}
