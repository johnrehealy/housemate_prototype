"use client";

import { Check } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { INLINE_LINK } from "./controls";

/*
 * "Didn't get it? Send again" (docs/design.md §4 Code boxes), shared by
 * Get started's G4 and sign-in's code step: after a new code, the count until
 * another can be asked for, then the link again.
 */

/** How long after sending before "Send again" comes back. */
export const RESEND_SECONDS = 30;

/** The seconds left on the count, and a way to start or stop it. */
export function useResendCountdown() {
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const start = useCallback(() => setResendIn(RESEND_SECONDS), []);
  const stop = useCallback(() => setResendIn(0), []);
  return { resendIn, start, stop };
}

/**
 * The announcement of a new code. Always there, so the change is heard, and
 * said once rather than every second; the visible count is hidden from
 * screen readers.
 */
export function ResendNotice({ sent }: { sent: boolean }) {
  return (
    <p role="status" className="sr-only">
      {sent
        ? `New code sent. You can ask again in ${RESEND_SECONDS} seconds.`
        : ""}
    </p>
  );
}

export function ResendRow({
  resendIn,
  busy,
  onResend,
}: {
  /** Seconds until "Send again" comes back; 0 once it has. */
  resendIn: number;
  busy: boolean;
  onResend: () => void;
}) {
  if (resendIn > 0) {
    return (
      <p className="flex h-9 items-center gap-2 text-label text-status-progress-fg">
        <Check size={18} aria-hidden className="shrink-0" />
        <span aria-hidden>
          New code sent. You can ask again in 0:
          {String(resendIn).padStart(2, "0")}.
        </span>
      </p>
    );
  }
  return (
    <p className="flex h-9 items-center gap-1.5 text-label">
      <span className="text-muted">Didn&rsquo;t get it?</span>
      <button
        type="button"
        onClick={onResend}
        disabled={busy}
        className={INLINE_LINK}
      >
        Send again
      </button>
    </p>
  );
}
