"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * The code boxes (docs/design.md §4 Code boxes, board G4): one input drawn as
 * six boxes, so pasting and the phone's code suggestion fill all six at once.
 * The input covers the boxes, invisible, and the boxes draw its value, and
 * its selection: after a wrong code the digits are selected, so typing or
 * pasting replaces them, and each selected digit gets a fill to say so.
 */
export function CodeBoxes({
  value,
  onChange,
  invalid,
  busy,
  inputRef,
  describedBy,
}: {
  value: string;
  onChange: (digits: string) => void;
  invalid: boolean;
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  describedBy?: string;
}) {
  const [focused, setFocused] = useState(false);
  // The input's selection, as [start, end). Empty when they're equal.
  const [selection, setSelection] = useState<[number, number]>([0, 0]);
  const next = Math.min(value.length, 5);

  // Read from the browser's own event. React's onSelect misses a selection
  // made in code, as after a wrong code, when its root is the document, as
  // Next's is: it never listens for selectionchange there.
  useEffect(() => {
    function read() {
      const input = inputRef.current;
      if (input)
        setSelection([input.selectionStart ?? 0, input.selectionEnd ?? 0]);
    }
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, [inputRef]);

  return (
    <div className="relative mx-auto flex w-full max-w-[396px] justify-between gap-2 md:gap-3">
      {Array.from({ length: 6 }, (_, index) => {
        const digit = value[index];
        const selected =
          focused && index >= selection[0] && index < selection[1];
        const waiting = focused && !busy && !invalid && index === next;
        const tone = invalid
          ? "border-status-blocked-fg"
          : waiting
            ? "border-evergreen shadow-[inset_0_0_0_1px_var(--color-evergreen)]"
            : "border-line-field";
        return (
          <div
            key={index}
            aria-hidden
            className={`flex h-16 min-w-0 flex-1 items-center justify-center rounded-md border bg-surface text-[28px] leading-9 text-heading tabular-nums md:w-14 md:flex-none ${tone}`}
          >
            {digit === undefined ? (
              waiting && value.length < 6 ? (
                <span className="hm-caret h-7 w-px bg-heading" />
              ) : null
            ) : selected ? (
              <span className="rounded-[3px] bg-evergreen/12 px-[3px]">
                {digit}
              </span>
            ) : (
              digit
            )}
          </div>
        );
      })}
      <input
        ref={inputRef}
        id="code"
        name="code"
        aria-label="Six-digit code"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        readOnly={busy}
        className="absolute inset-0 size-full cursor-text opacity-0"
      />
    </div>
  );
}
