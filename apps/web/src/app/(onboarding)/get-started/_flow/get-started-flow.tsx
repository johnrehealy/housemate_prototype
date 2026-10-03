"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useResendCountdown } from "@/components/onboarding/resend";
import { HELPER, QUESTION } from "../../_components/onboarding-header";
import { confirmCode, sendCode, submitDetails } from "./actions";
import {
  AddressStep,
  checkAddress,
  EMPTY_ADDRESS,
  type AddressErrors,
  type AddressValue,
} from "./address-step";
import { CodeStep, PILOT_FULL } from "./code-step";
import { ContactStep, hasNumber, type ContactErrors } from "./contact-step";
import { LinkExpired } from "./link-expired";
import {
  Actions,
  LargeButton,
  Progress,
  SOMETHING_WRONG,
  StepError,
  STEPS,
  TextField,
} from "./parts";
import type { CodeChannel, HomeAddress } from "./types";
import { Waitlisted } from "./waitlisted";

/*
 * Get started (docs/design.md §4 Get started, D-072 to D-074): G0 Welcome,
 * G1 name, G2 home, G3 contact, G4 code. It's the waitlist: everyone gives
 * the same details, and only someone on the alpha list, while the pilot has
 * room, gets a code and an account. Everyone else sees W1.
 *
 * One component holds every step, so Continue checks the step on the device
 * and moves on without waiting for the network. Only G3's Continue, G0's on a
 * link and the code talk to the server.
 *
 * Each step is a history entry, so the browser's back button and Back do the
 * same thing and nothing typed is lost either way.
 */

type Step = 0 | 1 | 2 | 3 | 4;

/** What the page knows already: the link's saved details, or nothing. */
export type Prefill = {
  email: string;
  firstName: string;
  lastName: string;
  /** Formatted for the field, or blank. */
  phone: string;
  address: HomeAddress | null;
};

/** Where G0's button goes: a step, or straight to the code. */
export type StartAt = 1 | 2 | 3 | "code";

const WRONG_CODE = "That code didn’t work. Check it, or send a new one.";

/*
 * The step rides alongside the router's own history state rather than
 * replacing it: Next reloads the page on a Back to an entry without its
 * marker, and this component's first effect runs before Next patches the
 * history methods to keep that marker.
 *
 * It holds only while Next leaves the page's entries alone, so no server
 * action here may set a cookie until the flow is done. A cookie set in an
 * action makes Next render the page again in place, and that rewrites the
 * entry: the step is dropped, and the address Next knows (not the link a
 * website visitor's address bar now shows) is pushed as a new entry.
 */
function withStep(step: Step, waitlisted = false) {
  return {
    ...window.history.state,
    getStartedStep: step,
    getStartedWaitlisted: waitlisted,
  };
}

function pushStep(step: Step, url?: string) {
  window.history.pushState(withStep(step), "", url);
}

/** An entry's place in the flow. W1 follows G3, where G4 would. */
function entryIndex(state: unknown): number {
  const entry = state as {
    getStartedStep?: Step;
    getStartedWaitlisted?: boolean;
  } | null;
  return entry?.getStartedWaitlisted ? 4 : (entry?.getStartedStep ?? 0);
}

function prefilledAddress(
  address: HomeAddress | null,
  lookupEnabled: boolean,
): AddressValue {
  if (!address) {
    return { ...EMPTY_ADDRESS, mode: lookupEnabled ? "search" : "manual" };
  }
  // Saved details come back as typed fields, which can be edited or searched.
  return {
    ...EMPTY_ADDRESS,
    mode: "manual",
    manual: {
      line1: address.line1,
      city: address.city,
      state: address.state,
      zip: address.zip,
    },
    unit: address.unit ?? "",
  };
}

function homeAddress(address: AddressValue): HomeAddress {
  const unit = address.unit.trim() || undefined;
  if (address.mode === "search" && address.picked) {
    const { line1, city, state, zip, placeId } = address.picked;
    return { line1, city, state, zip, placeId, unit };
  }
  return { ...address.manual, unit };
}

export function GetStartedFlow({
  token,
  emailedLink = false,
  prefill,
  startAt,
  lookupEnabled,
  termsVersion,
  textsVersion,
}: {
  /** The link the page was opened from; none from the website. */
  token?: string;
  /** The link was emailed, which proves the email (D-073). */
  emailedLink?: boolean;
  prefill: Prefill;
  startAt: StartAt;
  lookupEnabled: boolean;
  termsVersion: string;
  textsVersion: string;
}) {
  const [step, setStep] = useState<Step>(0);
  const [motion, setMotion] = useState<{
    phase: "idle" | "out" | "in";
    dir: 1 | -1;
  }>({ phase: "idle", dir: 1 });
  const [view, setView] = useState<
    | { kind: "steps" }
    | { kind: "expired" }
    | { kind: "waitlisted"; firstName: string; email: string }
  >({ kind: "steps" });

  const [first, setFirst] = useState(prefill.firstName);
  const [last, setLast] = useState(prefill.lastName);
  const [address, setAddress] = useState<AddressValue>(() =>
    prefilledAddress(prefill.address, lookupEnabled),
  );
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  // Both boxes start unticked, every time (Twilio 30923).
  const [terms, setTerms] = useState(false);
  const [texts, setTexts] = useState(false);

  // The link the code confirms against: the page's own, or one G3 was given.
  const [codeToken, setCodeToken] = useState(token);
  const [channel, setChannel] = useState<CodeChannel>(
    prefill.phone ? "sms" : "email",
  );
  const [code, setCode] = useState("");
  // The entry W1 showed. If they go back and change the email, it moves to
  // the new one rather than staying behind under the old.
  const waitlistEntry = useRef<string | undefined>(undefined);

  const [nameErrors, setNameErrors] = useState<
    Partial<Record<"first" | "last", string>>
  >({});
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [member, setMember] = useState<"email" | "phone">();
  const [codeError, setCodeError] = useState<string>();
  const [pilotFull, setPilotFull] = useState(false);
  const countdown = useResendCountdown();
  const [stepError, setStepError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Bumped whenever errors show, so focus moves to the first one.
  const [errorTick, setErrorTick] = useState(0);
  const flagErrors = () => setErrorTick((tick) => tick + 1);

  const section = useRef<HTMLElement>(null);
  const viewRoot = useRef<HTMLDivElement>(null);
  const announcer = useRef<HTMLParagraphElement>(null);
  // A message for the step a Back is about to show.
  const backMessage = useRef<string | undefined>(undefined);

  /** Moves to another step, with G10's motion unless motion is reduced. */
  const go = useCallback((next: Step, dir: 1 | -1, message?: string) => {
    setStepError(message);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setStep(next);
      setMotion({ phase: "idle", dir });
      return;
    }
    setMotion({ phase: "out", dir });
    window.setTimeout(() => {
      setStep(next);
      setMotion({ phase: "in", dir });
    }, 140);
  }, []);

  /** Forward to a step, one history entry for each step on the way. */
  function forward(from: Step, to: Step, url?: string) {
    for (let next = from + 1; next <= to; next++) {
      pushStep(next as Step, next === to ? url : undefined);
    }
    go(to, 1);
  }

  /** Back one step, as the browser's back button does, with a message. */
  const back = useCallback((message?: string) => {
    backMessage.current = message;
    window.history.back();
  }, []);

  // The browser's back button, and Back, which uses it. Forward isn't a way
  // through the steps, since each one's Continue checks it first, so the
  // browser's forward button is undone. W1 has its own entry, so back from it
  // is G3 with everything kept.
  useEffect(() => {
    function onPop(event: PopStateEvent) {
      if (view.kind === "expired") return;
      const here = view.kind === "waitlisted" ? 4 : step;
      const target = entryIndex(event.state);
      const message = backMessage.current;
      backMessage.current = undefined;
      if (target > here) {
        window.history.go(here - target);
        return;
      }
      if (target === here) return;
      if (view.kind === "waitlisted") setView({ kind: "steps" });
      const targetStep = Math.min(target, 3) as Step;
      if (targetStep < step) go(targetStep, -1, message);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [go, step, view.kind]);

  // G0's own history entry, so going back to it has a state.
  useEffect(() => {
    window.history.replaceState(withStep(0), "");
  }, []);

  // Focus the new step's first field and announce its question, and again
  // when Back leaves W1 for G3. G0 is left alone on arrival, as any page is.
  useEffect(() => {
    if (motion.phase === "out" || step === 0 || view.kind !== "steps") return;
    // Each step starts at the top, as a new page would; G3 runs long.
    window.scrollTo({ top: 0 });
    const root = section.current;
    const target = root?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([readonly]), select",
    );
    target?.focus({ preventScroll: true });
    if (announcer.current && root) {
      const question = root.querySelector("h1")?.innerText ?? "";
      announcer.current.textContent = `Step ${step} of ${STEPS}. ${question.replace(/\s+/g, " ")}`;
    }
    // Only when the step or the view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, view.kind]);

  // W1 or G6 in place of the steps: focus its heading, so it's read out.
  useEffect(() => {
    if (view.kind === "steps") return;
    viewRoot.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [view.kind]);

  // Errors move focus to the first field that has one.
  useEffect(() => {
    if (errorTick === 0) return;
    section.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errorTick]);

  // --- G0 -----------------------------------------------------------------
  function start() {
    setStepError(undefined);
    if (startAt !== "code") return forward(0, startAt);
    startTransition(async () => {
      if (!codeToken) return;
      const result = await sendCode(codeToken);
      switch (result.status) {
        case "sent":
          setChannel(result.channel);
          return forward(0, 4);
        case "stale":
          return forward(0, 3);
        case "member":
          setMember(result.field);
          return forward(0, 3);
        case "pilot_full":
          return setStepError(PILOT_FULL);
        case "link":
          return setView({ kind: "expired" });
        case "error":
          return setStepError(SOMETHING_WRONG);
      }
    });
  }

  // --- G1 -----------------------------------------------------------------
  function submitName(event: FormEvent) {
    event.preventDefault();
    const next: typeof nameErrors = {};
    if (!first.trim()) next.first = "Enter your first name.";
    if (!last.trim()) next.last = "Enter your last name.";
    setNameErrors(next);
    if (Object.keys(next).length > 0) return flagErrors();
    forward(1, 2);
  }

  // --- G2 -----------------------------------------------------------------
  function submitHome(event: FormEvent) {
    event.preventDefault();
    const next = checkAddress(address);
    setAddressErrors(next);
    if (Object.keys(next).length > 0) return flagErrors();
    forward(2, 3);
  }

  // --- G3 -----------------------------------------------------------------
  function submitContact() {
    setStepError(undefined);
    startTransition(async () => {
      const result = await submitDetails({
        token,
        email,
        firstName: first.trim(),
        lastName: last.trim(),
        phone,
        textsAgreed: hasNumber(phone) && texts,
        textsVersion,
        termsVersion,
        address: homeAddress(address),
        browserZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        replaces: waitlistEntry.current,
      });
      switch (result.status) {
        case "code":
          setCodeToken(result.token);
          setChannel(result.channel);
          setCode("");
          setCodeError(undefined);
          setPilotFull(false);
          countdown.stop();
          // From the website the address bar becomes the link, so a reload
          // picks up where this left off.
          return forward(
            3,
            4,
            token ? undefined : `/get-started/${result.token}`,
          );
        case "waitlisted":
          waitlistEntry.current = result.entry;
          window.history.pushState(withStep(3, true), "");
          return setView({
            kind: "waitlisted",
            firstName: result.firstName,
            email: result.email,
          });
        case "member":
          setMember(result.field);
          return flagErrors();
        case "invalid":
          setContactErrors({
            [result.field]:
              result.field === "email"
                ? "Enter your email address."
                : "Enter a 10-digit mobile number.",
          });
          return flagErrors();
        case "link":
          return setView({ kind: "expired" });
        case "error":
          return setStepError(SOMETHING_WRONG);
      }
    });
  }

  // --- G4 -----------------------------------------------------------------
  const submitted = useRef<string | null>(null);

  const checkCode = useCallback(
    (digits: string) => {
      if (!codeToken) return;
      startTransition(async () => {
        // Success goes on into the app, so only a failure comes back.
        const result = await confirmCode(codeToken, digits);
        if (!result) return;
        switch (result.status) {
          case "wrong_code":
            return setCodeError(WRONG_CODE);
          case "pilot_full":
            return setPilotFull(true);
          case "stale":
            return back(SOMETHING_WRONG);
          case "link":
            return setView({ kind: "expired" });
          case "error":
            return setCodeError(SOMETHING_WRONG);
        }
      });
    },
    [codeToken, back],
  );

  // The sixth digit submits. The digits already sent aren't sent again.
  useEffect(() => {
    if (step !== 4) return;
    if (code.length < 6) {
      submitted.current = null;
      return;
    }
    if (code === submitted.current) return;
    submitted.current = code;
    checkCode(code);
  }, [code, step, checkCode]);

  function resend() {
    if (!codeToken) return;
    setCodeError(undefined);
    startTransition(async () => {
      const result = await sendCode(codeToken);
      switch (result.status) {
        case "sent":
          setCode("");
          countdown.start();
          return;
        case "pilot_full":
          return setPilotFull(true);
        case "member":
          setMember(result.field);
          return back();
        case "stale":
          return back(SOMETHING_WRONG);
        case "link":
          return setView({ kind: "expired" });
        case "error":
          return setCodeError(SOMETHING_WRONG);
      }
    });
  }

  // --- Views ----------------------------------------------------------------
  if (view.kind === "expired") {
    return (
      <div ref={viewRoot} className="contents">
        <LinkExpired />
      </div>
    );
  }

  const firstName = first.trim();
  const questions: Record<Step, ReactNode> = {
    0: "Welcome to Housemate.",
    1: "What’s your name?",
    2: (
      <>
        Nice to meet you, {firstName}.
        <br />
        Where&rsquo;s home?
      </>
    ),
    3: "How may we contact you?",
    4: channel === "sms" ? "Check your texts…" : "Check your email…",
  };

  const motionClass =
    motion.phase === "out"
      ? "hm-step-out"
      : motion.phase === "in"
        ? "hm-step-in"
        : "";

  return (
    // Clipped sideways, so a step sliding in (G10) never widens the page.
    <div
      ref={viewRoot}
      className="mx-auto flex w-full max-w-[720px] flex-col items-center overflow-x-clip px-5 pt-6 pb-10 md:pt-[72px]"
    >
      {view.kind === "waitlisted" ? (
        <Waitlisted
          firstName={view.firstName}
          email={view.email}
          onChangeEmail={token ? undefined : () => back()}
        />
      ) : (
        <>
          {step > 0 ? <Progress step={step} /> : null}
          <p ref={announcer} aria-live="polite" className="sr-only" />

          <section
            ref={section}
            key={step}
            aria-labelledby="step-question"
            className={`flex w-full flex-col items-center ${motionClass}`}
            style={{ "--hm-step-dir": motion.dir } as CSSProperties}
            onAnimationEnd={() =>
              motion.phase === "in" &&
              setMotion((m) => ({ ...m, phase: "idle" }))
            }
          >
            <div className="mt-7 flex flex-col items-center gap-3 text-center md:mt-10 md:gap-4">
              <h1 id="step-question" className={QUESTION}>
                {questions[step]}
              </h1>
              {step === 0 ? (
                <p className={`${HELPER} max-w-[560px] text-pretty`}>
                  Text Housemate whenever something at home needs to get done.
                  It handles the details, with real people on the ground when a
                  task needs them.
                </p>
              ) : null}
            </div>

            <div className="mt-8 w-full max-w-[600px] md:mt-12">
              {step === 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <LargeButton
                    type="button"
                    onClick={start}
                    busy={pending}
                    label={pending ? "Sending code…" : "Let’s get started"}
                  />
                  <p className="text-sm font-normal text-muted">
                    Takes about two minutes
                  </p>
                  <StepError message={stepError} />
                </div>
              ) : null}

              {step === 1 ? (
                <form onSubmit={submitName} noValidate>
                  <div className="flex flex-col gap-4 md:flex-row">
                    <TextField
                      id="first-name"
                      label="First name"
                      value={first}
                      onChange={(value) => {
                        setFirst(value);
                        setNameErrors((e) => ({ ...e, first: undefined }));
                      }}
                      autoComplete="given-name"
                      error={nameErrors.first}
                    />
                    <TextField
                      id="last-name"
                      label="Last name"
                      value={last}
                      onChange={(value) => {
                        setLast(value);
                        setNameErrors((e) => ({ ...e, last: undefined }));
                      }}
                      autoComplete="family-name"
                      error={nameErrors.last}
                    />
                  </div>
                  <Actions label="Continue" />
                </form>
              ) : null}

              {step === 2 ? (
                <form onSubmit={submitHome} noValidate>
                  <AddressStep
                    token={token}
                    lookupEnabled={lookupEnabled}
                    value={address}
                    onChange={(value) => {
                      setAddress(value);
                      setAddressErrors({});
                    }}
                    errors={addressErrors}
                  />
                  <Actions label="Continue" onBack={() => back()} />
                </form>
              ) : null}

              {step === 3 ? (
                <ContactStep
                  emailLocked={Boolean(token)}
                  emailedLink={emailedLink}
                  email={email}
                  onEmail={(value) => {
                    setEmail(value);
                    if (member === "email") setMember(undefined);
                  }}
                  phone={phone}
                  onPhone={(value) => {
                    setPhone(value);
                    // The texts box goes with the number.
                    if (!hasNumber(value)) setTexts(false);
                    if (member === "phone") setMember(undefined);
                  }}
                  terms={terms}
                  onTerms={setTerms}
                  texts={texts}
                  onTexts={setTexts}
                  errors={contactErrors}
                  onErrors={(errors) => {
                    setContactErrors(errors);
                    if (Object.values(errors).some(Boolean)) flagErrors();
                  }}
                  member={member}
                  stepError={stepError}
                  busy={pending}
                  busyLabel={token ? "Sending code…" : "Saving…"}
                  onBack={() => back()}
                  onContinue={submitContact}
                />
              ) : null}

              {step === 4 ? (
                <CodeStep
                  channel={channel}
                  code={code}
                  onCode={(digits) => {
                    setCode(digits);
                    if (codeError) setCodeError(undefined);
                  }}
                  error={codeError}
                  busy={pending}
                  resendIn={countdown.resendIn}
                  pilotFull={pilotFull}
                  onResend={resend}
                  onDifferent={() => back()}
                />
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
