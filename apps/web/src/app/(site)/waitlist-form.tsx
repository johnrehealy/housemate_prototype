"use client";

import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitWaitlist } from "./actions";
import { INITIAL_WAITLIST_STATE } from "./state";

/*
 * The hero's waitlist (boards H3 → H1 → H2).
 *
 * The control classes below are deliberately a second copy of the ones at the
 * top of (auth)/sign-in/sign-in-form.tsx, which say they stay there until a
 * second consumer arrives. One has, but sign-in is being edited on another
 * branch right now, so extracting it would collide. HOU-58 converges them once
 * slice 0 lands. Until then: change one, change the other.
 *
 * These are the evergreen-ground variants — the field and button sit on the
 * hero, not on canvas — so the colours differ from sign-in's while the
 * geometry (40px, radius-md, the two-ring focus) is the same.
 */

const FIELD =
  "h-13 w-full rounded-xl border px-4 text-base focus:outline-hidden";
const FIELD_RESTING =
  "border-on-evergreen/42 bg-transparent text-on-evergreen placeholder:text-on-evergreen/62 hover:border-on-evergreen/62 focus:border-on-evergreen focus:shadow-[inset_0_0_0_1px_var(--color-on-evergreen)]";
const FIELD_ERROR =
  "border-on-evergreen bg-transparent text-on-evergreen placeholder:text-on-evergreen/62 shadow-[inset_0_0_0_1px_var(--color-on-evergreen)]";
const FIELD_BUSY =
  "border-on-evergreen/24 bg-transparent text-on-evergreen/62 placeholder:text-on-evergreen/42";

/** Canvas fill on evergreen, the inverse of sign-in's primary button. */
const PRIMARY_BUTTON =
  "flex h-13 items-center justify-center gap-2 rounded-xl bg-canvas px-8 text-base text-evergreen transition-opacity duration-120 ease-out hover:opacity-90 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)] disabled:opacity-60";

const MESSAGE = "flex gap-2 pt-1 text-xs";

export function WaitlistForm() {
  const [state, action, pending] = useActionState(
    submitWaitlist,
    INITIAL_WAITLIST_STATE,
  );
  /*
   * Whether the email bar is showing. The board flips the button to the bar in
   * place with no round trip, so this is the one piece of state the server
   * doesn't own. An error keeps it open, or the message would appear next to a
   * field that had just vanished.
   */
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  // Focus follows the flip, so the keyboard lands where the eye does.
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  /*
   * Every "Join the waitlist" that isn't this one — the ribbon's and the
   * close's — is an anchor to #waitlist. Without this they land on the closed
   * button, so the close's call to action costs a 6,000px scroll back up and
   * then a second click before there is anywhere to type. Opening on the hash
   * makes the jump land on a focused field.
   */
  useEffect(() => {
    const openOnHash = () => {
      if (window.location.hash === "#waitlist") setOpen(true);
    };
    openOnHash();
    window.addEventListener("hashchange", openOnHash);
    return () => window.removeEventListener("hashchange", openOnHash);
  }, []);

  if (state.status === "joined") {
    return (
      <p
        className="flex items-center gap-2 text-lead text-on-evergreen"
        role="status"
      >
        <CheckCircle size={24} aria-hidden className="shrink-0" />
        Thanks for joining the waitlist!
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={PRIMARY_BUTTON}
      >
        Join the waitlist
      </button>
    );
  }

  const invalid = Boolean(state.error);

  return (
    <form action={action} className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="waitlist-email" className="sr-only">
            Email address
          </label>
          <input
            ref={field}
            id="waitlist-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            readOnly={pending}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "waitlist-message" : undefined}
            className={`${FIELD} ${
              pending ? FIELD_BUSY : invalid ? FIELD_ERROR : FIELD_RESTING
            }`}
          />
        </div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? (
            <>
              <CircleNotch
                size={20}
                aria-hidden
                className="shrink-0 animate-spin motion-reduce:animate-none"
              />
              Joining…
            </>
          ) : (
            "Join the waitlist"
          )}
        </button>
      </div>
      {invalid ? (
        <p
          id="waitlist-message"
          role="alert"
          className={`${MESSAGE} text-on-evergreen`}
        >
          <WarningCircle size={20} aria-hidden className="shrink-0" />
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
