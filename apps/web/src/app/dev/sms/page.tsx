import { getSmsThread } from "@housemate/core/db";
import { formatUsPhone, toE164 } from "@housemate/core/phone";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { serverDb, serverEnv } from "@/lib/server-context";
import { Refresh } from "./refresh";
import { SimulatorForm } from "./simulator-form";

export const metadata: Metadata = { title: "SMS simulator" };

/*
 * The local SMS simulator (D-009). Dev tooling that no member sees, so it's
 * deliberately plain rather than designed, and it doesn't exist in production.
 *
 * The thread is read on the server connection, because row-level security
 * would hide texts from numbers that aren't invited, and those are half of
 * what this page is for. Signing in is still required.
 */
export default async function SmsSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  if (serverEnv().APP_ENV === "production") notFound();
  const member = await requireMember();

  const { from } = await searchParams;
  const phone = (typeof from === "string" && toE164(from)) || member.phone;
  const thread = await getSmsThread(serverDb(), phone);

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-display text-heading">SMS simulator</h1>
        <p className="text-label text-muted">
          Texts go through the real inbound webhook, signed the way Twilio signs
          them. Nothing is sent to Twilio.
        </p>
      </div>

      <SimulatorForm from={formatUsPhone(phone)} />

      <section className="flex flex-col gap-3" aria-labelledby="thread">
        <h2 id="thread" className="text-label text-heading">
          Texts with {formatUsPhone(phone)}
        </h2>
        {thread.length === 0 ? (
          <p className="text-label text-muted">No texts yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {thread.map((message) => (
              <li
                key={message.id}
                className="flex flex-col gap-1 rounded-md border border-line bg-surface px-3 py-2"
              >
                <span className="text-xs text-muted">
                  {message.direction === "inbound"
                    ? "To Housemate"
                    : "From Housemate"}{" "}
                  · {message.createdAt.toLocaleTimeString("en-US")} ·{" "}
                  {message.deliveryStatus}
                  {message.direction === "inbound" && !message.homeId
                    ? " · not invited"
                    : ""}
                  {message.media.length > 0
                    ? ` · ${message.media.length} attachment(s)`
                    : ""}
                </span>
                <span className="text-base text-heading">{message.body}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Refresh />
    </main>
  );
}
