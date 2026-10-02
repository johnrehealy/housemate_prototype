"use client";

import { useActionState } from "react";
import { sendSimulatedText } from "./actions";

export type SimulatorState = { error: string | null };

const FIELD =
  "rounded-md border border-muted bg-surface px-3 py-2 text-base text-heading";

export function SimulatorForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState(sendSimulatedText, {
    error: null,
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs">
        From
        <input name="from" defaultValue={from} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs">
        Message
        <textarea name="body" rows={3} required className={FIELD} />
      </label>
      {state.error ? (
        <p role="alert" className="text-xs text-status-blocked-fg">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 self-start rounded-md bg-evergreen px-4 text-label text-on-evergreen disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send text"}
      </button>
    </form>
  );
}
