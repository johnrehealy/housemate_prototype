"use client";

import { ArrowLeft, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { BACK_BUTTON } from "@/components/onboarding/controls";
import { ResendNotice, ResendRow } from "@/components/onboarding/resend";
import { CodeBoxes } from "./code-boxes";
import type { CodeChannel } from "./types";

/*
 * G4's answer (docs/design.md §4 Get started and Code boxes, D-073): the six
 * boxes, then "Didn't get it? Send again" and the way back to G3. The sixth
 * digit submits; there's no button.
 */

export const PILOT_FULL =
  "The pilot filled up while you were setting up. You’re still on the waitlist, and we’ll email you when there’s a place.";

export function CodeStep({
  channel,
  code,
  onCode,
  error,
  busy,
  resendIn,
  pilotFull,
  onResend,
  onDifferent,
}: {
  channel: CodeChannel;
  code: string;
  onCode: (digits: string) => void;
  error?: string;
  busy: boolean;
  /** Seconds until "Send again" comes back; 0 once it has. */
  resendIn: number;
  pilotFull: boolean;
  onResend: () => void;
  onDifferent: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const sent = resendIn > 0;

  // A wrong code keeps its digits, selected, so typing or pasting replaces
  // them (docs/design.md §4 Code boxes).
  useEffect(() => {
    if (error && !busy) {
      input.current?.focus();
      input.current?.select();
    }
  }, [error, busy]);

  // A new code clears the boxes, so the next digit goes straight in.
  useEffect(() => {
    if (sent) input.current?.focus();
  }, [sent]);

  return (
    <div className="flex flex-col items-center gap-10">
      <ResendNotice sent={sent} />
      <div className="flex w-full flex-col items-center">
        <CodeBoxes
          inputRef={input}
          value={code}
          onChange={onCode}
          invalid={Boolean(error)}
          busy={busy}
          describedBy="code-message"
        />
        <CodeLine error={error} busy={busy} />
      </div>

      <div className="flex flex-col items-center gap-1">
        {pilotFull ? (
          <p
            role="alert"
            className="flex max-w-[600px] items-start gap-2.5 rounded-md bg-status-blocked-bg px-4 py-3.5 text-sm font-normal text-status-blocked-fg"
          >
            <WarningCircle size={18} aria-hidden className="mt-px shrink-0" />
            {PILOT_FULL}
          </p>
        ) : (
          <ResendRow resendIn={resendIn} busy={busy} onResend={onResend} />
        )}
        <button
          type="button"
          onClick={onDifferent}
          disabled={busy}
          className={BACK_BUTTON}
        >
          <ArrowLeft size={18} aria-hidden className="shrink-0" />
          {channel === "sms"
            ? "Use a different number"
            : "Use a different email"}
        </button>
      </div>
    </div>
  );
}

/**
 * The error line 16px under the boxes, or "Checking…" while the code is
 * checked. Empty, it takes no room, so "Send again" sits 40px under the boxes.
 */
function CodeLine({ error, busy }: { error?: string; busy: boolean }) {
  // Live from the start, so the change to "Checking…" or the error is heard.
  return (
    <p
      id="code-message"
      role="status"
      className={`flex items-start gap-2 text-xs ${
        busy || error ? "mt-4" : ""
      } ${error && !busy ? "text-status-blocked-fg" : "text-muted"}`}
    >
      {busy ? (
        <>
          <CircleNotch
            size={18}
            aria-hidden
            className="shrink-0 animate-spin text-evergreen motion-reduce:animate-none"
          />
          Checking…
        </>
      ) : error ? (
        <>
          <WarningCircle size={18} aria-hidden className="mt-px shrink-0" />
          {error}
        </>
      ) : null}
    </p>
  );
}
