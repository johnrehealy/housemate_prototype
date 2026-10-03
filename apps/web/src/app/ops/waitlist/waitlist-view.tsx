"use client";

import { Copy, Envelope, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { letInByEmail } from "./actions";
import { shortDate } from "./format";

export type WaitlistRow = {
  signupId: string;
  email: string;
  name?: string;
  /** Let in from the toolbar without being on the list first. */
  addedOnOps: boolean;
  home?: string;
  joinedAt: string;
  letIn: boolean;
  link: { expiresAt: string; open: boolean; emailed: boolean } | null;
};

/** A link that didn't go by email, shown once under its row. */
type Unsent = { email: string; link: string; expiresAt: string };

const SECTION_LABEL = "text-xs tracking-wide text-muted uppercase";
const HEAD = "h-9 text-left text-xs font-normal text-muted";
const CHIP =
  "inline-flex h-[26px] items-center rounded-full px-[11px] text-xs leading-[18px]";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen";
const PRIMARY = `flex h-10 shrink-0 items-center gap-2 rounded-md bg-evergreen px-4 text-label text-on-evergreen transition-opacity duration-120 ease-out hover:opacity-90 disabled:opacity-60 ${FOCUS}`;
const SECONDARY = `flex shrink-0 items-center gap-2 rounded-md border border-line-strong bg-surface text-sm font-normal text-body transition-colors duration-120 ease-out hover:border-muted disabled:opacity-60 ${FOCUS}`;
const FIELD =
  "h-10 rounded-md border bg-surface px-3 text-sm font-normal text-heading placeholder:text-muted focus:border-evergreen focus:shadow-[inset_0_0_0_1px_var(--color-evergreen)] focus:outline-hidden";

/**
 * The waitlist and letting people in (board O5). Let in and Send again both
 * email a new Get started link; one that couldn't be emailed opens a panel
 * under its row with the link to send by hand. Only the link's hash is kept,
 * so each panel stays until the page reloads and can't be shown again.
 */
export function WaitlistView({
  rows,
  figures,
}: {
  rows: WaitlistRow[];
  figures: ReactNode;
}) {
  const [unsent, setUnsent] = useState<Record<string, Unsent>>({});
  // The panel that just opened, whose Copy link takes focus.
  const [opened, setOpened] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string }>();
  const [formError, setFormError] = useState<string>();
  const [announce, setAnnounce] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function run(email: string, from: string, onDone?: () => void) {
    setBusy(from);
    setRowError(undefined);
    setFormError(undefined);
    startTransition(async () => {
      const result = await letInByEmail(email);
      setBusy(null);
      if (!result.ok) {
        if (from === "form") setFormError(result.error);
        else setRowError({ id: from, text: result.error });
        return;
      }
      onDone?.();
      if (result.emailed) {
        setAnnounce(`Let in ${email}, and emailed them a link.`);
      } else {
        setUnsent((current) => ({
          ...current,
          [result.signupId]: {
            email,
            link: result.link,
            expiresAt: result.expiresAt,
          },
        }));
        setOpened(result.signupId);
        setAnnounce(`Let in ${email}. The email didn’t go: the link is below.`);
      }
      // New rows, statuses and figures. The panels live here, so they stay.
      router.refresh();
    });
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announce}
      </p>
      <Toolbar
        busy={busy === "form"}
        disabled={busy !== null}
        error={formError}
        onLetIn={(email, clear) => run(email, "form", clear)}
      />
      {figures}

      <section aria-labelledby="waitlist-heading" className="pt-12">
        <div className="flex h-5 items-center justify-between">
          <h2 id="waitlist-heading" className={SECTION_LABEL}>
            Waitlist ({rows.length})
          </h2>
          {rows.length > 0 ? (
            <p className="text-xs text-muted">Oldest first</p>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 flex h-(--spacing-row) items-center border-y border-line text-sm font-normal text-muted">
            No one is on the waitlist.
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse">
            {/* O5's 200, 240, 128 and 128px columns, each 12px after the last. */}
            <colgroup>
              <col />
              <col className="w-53" />
              <col className="w-63" />
              <col className="w-35" />
              <col className="w-35" />
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={HEAD}>
                  Person
                </th>
                <th scope="col" className={`${HEAD} pl-3`}>
                  Home
                </th>
                <th scope="col" className={`${HEAD} pl-3`}>
                  Status
                </th>
                <th scope="col" className={`${HEAD} pl-3`}>
                  Joined
                </th>
                <th scope="col" className={`${HEAD} pl-3`}>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const panel = unsent[row.signupId];
                const error =
                  rowError?.id === row.signupId ? rowError.text : undefined;
                const below = Boolean(panel || error);
                return (
                  <Fragment key={row.signupId}>
                    <tr
                      className={`h-16 ${below ? "" : "border-b border-line"}`}
                    >
                      <Person row={row} />
                      <td className="truncate pl-3 text-sm font-normal text-body">
                        {row.home ?? <span className="text-muted">—</span>}
                      </td>
                      <td className="pl-3">
                        <StatusChip row={row} />
                      </td>
                      <td className="pl-3 text-xs text-muted">
                        {shortDate(row.joinedAt)}
                      </td>
                      <td className="pl-3 text-right">
                        {/* While its link is shown, there's nothing to do but send it. */}
                        {panel ? null : (
                          <button
                            type="button"
                            onClick={() => run(row.email, row.signupId)}
                            disabled={busy !== null}
                            className={`${SECONDARY} ml-auto h-8 px-3`}
                          >
                            {busy === row.signupId
                              ? "Sending…"
                              : row.letIn
                                ? "Send again"
                                : "Let in"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {below ? (
                      <tr className="border-b border-line">
                        <td colSpan={5} className="pb-4">
                          {error ? (
                            <p
                              role="alert"
                              className="flex items-center gap-2 text-xs text-status-blocked-fg"
                            >
                              <WarningCircle
                                size={18}
                                aria-hidden
                                className="shrink-0"
                              />
                              {error}
                            </p>
                          ) : null}
                          {panel ? (
                            <UnsentPanel
                              unsent={panel}
                              focus={opened === row.signupId}
                              className={error ? "mt-3" : ""}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        <p className="mt-4 pb-16 text-xs text-muted">
          Let in emails a Get started link from john@myhousemate.co. It works
          once and lasts 14 days, and a new one replaces the last. Someone
          leaves the waitlist once they set up their account.
        </p>
      </section>
    </>
  );
}

/** "Who's waiting to join the pilot", and letting in any email. */
function Toolbar({
  busy,
  disabled,
  error,
  onLetIn,
}: {
  busy: boolean;
  disabled: boolean;
  error?: string;
  onLetIn: (email: string, clear: () => void) => void;
}) {
  const [email, setEmail] = useState("");
  const field = useRef<HTMLInputElement>(null);

  // A refusal puts focus back on the email, to fix it.
  useEffect(() => {
    if (error) field.current?.focus();
  }, [error]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLetIn(email.trim(), () => setEmail(""));
  }

  return (
    <div className="flex min-h-(--spacing-toolbar) flex-wrap items-center justify-between gap-x-6 gap-y-2 py-[18px]">
      <h1 className="text-lead text-body">
        Who&rsquo;s waiting to join the pilot
      </h1>
      <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            ref={field}
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            aria-label="Email address to let in"
            autoComplete="off"
            spellCheck={false}
            readOnly={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "let-in-error" : undefined}
            className={`${FIELD} w-75 ${
              error ? "border-status-blocked-fg" : "border-line-field"
            }`}
          />
          <button type="submit" disabled={disabled} className={PRIMARY}>
            {busy ? "Letting in…" : "Let in"}
          </button>
        </div>
        {error ? (
          <p
            id="let-in-error"
            role="alert"
            className="flex items-center gap-2 text-xs text-status-blocked-fg"
          >
            <WarningCircle size={18} aria-hidden className="shrink-0" />
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Person({ row }: { row: WaitlistRow }) {
  return (
    <td className="min-w-0">
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-normal text-heading">
          {row.name ?? row.email}
        </p>
        <p className="truncate text-xs text-muted">
          {row.name
            ? row.email
            : row.addedOnOps
              ? "Email only, added here"
              : "Email only, from the old form"}
        </p>
      </div>
    </td>
  );
}

function StatusChip({ row }: { row: WaitlistRow }) {
  const { link } = row;
  if (!row.letIn || !link) {
    return (
      <span className={`${CHIP} bg-status-idle-bg text-status-idle-fg`}>
        Waiting
      </span>
    );
  }
  if (!link.open) {
    return (
      <span className={`${CHIP} bg-status-action-bg text-status-action-fg`}>
        Expired {shortDate(link.expiresAt)}
      </span>
    );
  }
  return (
    <span className={`${CHIP} bg-status-progress-bg text-status-progress-fg`}>
      {link.emailed ? "Emailed" : "Not emailed"} · open until{" "}
      {shortDate(link.expiresAt)}
    </span>
  );
}

function UnsentPanel({
  unsent,
  focus,
  className = "",
}: {
  unsent: Unsent;
  focus: boolean;
  className?: string;
}) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const field = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // The panel replaces nothing, so focus goes to what's needed next.
  useEffect(() => {
    if (focus) button.current?.focus();
  }, [focus]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(unsent.link);
      setCopy("copied");
      window.setTimeout(() => setCopy("idle"), 2000);
    } catch {
      setCopy("failed");
      field.current?.focus();
      field.current?.select();
    }
  }

  const expires = shortDate(unsent.expiresAt);
  const mailto = `mailto:${unsent.email}?subject=${encodeURIComponent(
    "A spot opened up at Housemate",
  )}&body=${encodeURIComponent(unsent.link)}`;

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg bg-nav px-5 py-4 ${className}`}
    >
      <p className="flex items-start gap-2 text-sm font-normal text-body">
        <WarningCircle
          size={18}
          aria-hidden
          className="mt-px shrink-0 text-status-blocked-fg"
        />
        Couldn&rsquo;t email {unsent.email}. Send this link yourself: it&rsquo;s
        shown only this once, works once, and expires on {expires}.
      </p>
      <div className="flex gap-2">
        <input
          ref={field}
          readOnly
          aria-label={`Get started link for ${unsent.email}`}
          value={unsent.link}
          onFocus={(event) => event.currentTarget.select()}
          className={`${FIELD} min-w-0 flex-1 truncate border-line-strong text-body`}
        />
        <button
          ref={button}
          type="button"
          onClick={copyLink}
          className={PRIMARY}
        >
          <Copy size={20} aria-hidden className="shrink-0" />
          <span aria-live="polite">
            {copy === "copied" ? "Copied" : "Copy link"}
          </span>
        </button>
        <a href={mailto} className={`${SECONDARY} h-10 px-4`}>
          <Envelope size={20} aria-hidden className="shrink-0" />
          Email
        </a>
      </div>
      {copy === "failed" ? (
        <p role="alert" className="text-xs text-status-blocked-fg">
          Couldn&rsquo;t copy. Select the link and copy it yourself.
        </p>
      ) : null}
    </div>
  );
}
