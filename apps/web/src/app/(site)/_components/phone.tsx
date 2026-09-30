import { ArrowUp } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { Mark } from "@/components/brand";

/*
 * The phone rendering shared by P2 and P5, and its parts.
 *
 * It is a picture of the product, not the product: nothing here is
 * interactive, and the whole phone is aria-hidden. Each panel's heading and
 * body already say what the picture shows, so a screen reader that read the
 * thread as well would hear the same point twice, the second time as a wall of
 * out-of-context sentences.
 *
 * Round 4 draws the screen alone, as a hairline and a soft shadow rather than
 * a bezel, so the eye goes to what is on it and to the one thing each panel
 * lifts off it.
 */

/*
 * iOS's colours for a text to a business number, not ours: green for what the
 * member sent, grey for what came back. No phone lets a business colour the
 * member's own bubbles, so a branded bubble would read as a mock-up. Being the
 * platform's, they are not tokens.
 */
export const SMS_SENT = "bg-[#34C759] text-[#FFFFFF]";
const SMS_RECEIVED = "bg-[#E9E9EB] text-[#1C1C1E]";

export function Phone({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`flex h-[700px] w-[372px] max-w-full shrink-0 flex-col rounded-[48px] border border-line-strong bg-canvas shadow-float ${className}`}
    >
      {children}
    </div>
  );
}

/** The contact header: who the thread is with. */
export function PhoneContact() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 border-b border-line px-4 pt-7 pb-3.5">
      <span className="flex size-11 items-center justify-center rounded-full bg-evergreen">
        <Mark className="h-3 w-auto text-on-evergreen" label={null} />
      </span>
      <span className="text-xs text-body">Housemate</span>
    </div>
  );
}

/**
 * The thread. Top-aligned, so it reads like a conversation that started rather
 * than one centred in an empty screen.
 */
export function Thread({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`hm-thread flex flex-1 flex-col items-stretch justify-start gap-1.5 overflow-hidden px-3.5 pt-4 pb-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Timestamp({ children }: { children: ReactNode }) {
  return <p className="self-center pb-1.5 text-2xs text-muted">{children}</p>;
}

export function Bubble({
  from,
  children,
}: {
  from: "member" | "housemate";
  children: ReactNode;
}) {
  // `text-sm` is 700 in this system; a text message isn't bold.
  return (
    <p
      className={`max-w-[250px] rounded-[18px] px-3 py-2 text-sm font-normal ${
        from === "member"
          ? `self-end ${SMS_SENT}`
          : `self-start ${SMS_RECEIVED}`
      }`}
    >
      {children}
    </p>
  );
}

/** The bottom bar. It is drawn, never typed in. */
export function Composer() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-t border-evergreen/8 px-3.5 pb-2">
      <span className="flex h-[34px] flex-1 items-center rounded-full border border-line-strong bg-surface px-[13px] text-sm font-normal text-muted">
        Text Message
      </span>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${SMS_SENT}`}
      >
        <ArrowUp size={15} weight="bold" />
      </span>
    </div>
  );
}
