import { ArrowUp } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { Mark } from "@/components/brand";

/*
 * The phone rendering shared by P2, P3 and P5, and its parts.
 *
 * It is a picture of the product, not the product: nothing here is
 * interactive, and the whole phone is aria-hidden. Each panel's heading and
 * body already say what the picture shows, so a screen reader that read the
 * thread as well would hear the same point twice, the second time as a wall of
 * out-of-context sentences.
 */

export function Phone({
  children,
  screenClassName = "",
}: {
  children: ReactNode;
  screenClassName?: string;
}) {
  return (
    <div
      aria-hidden
      className="w-[372px] max-w-full shrink-0 rounded-[52px] border border-[#B3ABA5] bg-[#CFC8C3] p-2.5 shadow-[0_20px_44px_rgba(20,52,47,0.12)]"
    >
      <div
        className={`flex h-[680px] flex-col overflow-hidden rounded-[42px] border border-evergreen/10 bg-canvas ${screenClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

/** The contact header: who the thread is with. */
export function PhoneContact() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 border-b border-line px-4 pt-7 pb-3">
      <span className="flex size-11 items-center justify-center rounded-full bg-evergreen">
        <Mark className="h-4 w-auto text-on-evergreen" label={null} />
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
      className={`hm-thread flex flex-1 flex-col items-stretch justify-start gap-2.5 overflow-hidden px-3.5 pt-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function Timestamp({ children }: { children: ReactNode }) {
  return <p className="py-1 text-center text-2xs text-muted">{children}</p>;
}

export function Bubble({
  from,
  children,
}: {
  from: "member" | "housemate";
  children: ReactNode;
}) {
  const member = from === "member";
  return (
    <p
      className={`max-w-[248px] rounded-[18px] px-3.5 py-2.5 text-xs ${
        member
          ? "self-end bg-evergreen text-on-evergreen"
          : "self-start bg-line text-heading"
      }`}
    >
      {children}
    </p>
  );
}

/** The bottom bar. It is drawn, never typed in. */
export function Composer() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-line bg-canvas px-3 py-3">
      <span className="flex h-8 flex-1 items-center rounded-full border border-line-strong px-3 text-xs text-muted">
        Text Message
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-evergreen">
        <ArrowUp size={16} className="text-on-evergreen" />
      </span>
    </div>
  );
}
