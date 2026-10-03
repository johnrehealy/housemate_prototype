import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import { Check, WarningCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Fragment, type InputHTMLAttributes, type ReactNode } from "react";
import { CHECKBOX, CHECKBOX_ERROR, INLINE_LINK } from "./controls";

/*
 * G3's two boxes (docs/design.md §4 Checkbox, D-072, D-074): the required
 * Terms row, and the optional "Text me about my home" box, which appears once
 * a number is typed. Both are unticked on arrival (Twilio 30923).
 *
 * Get started passes real checkboxes. The /texts page draws pictures of the
 * boxes with the same words and links: both read the texts wording from
 * `SMS_OPT_IN`, so what is shown publicly is what members agree to.
 *
 * The links open in a new tab, so reading the Terms never loses a half-filled
 * Get started.
 */

type BoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  invalid?: boolean;
};

/** One 15/20 line in heading, as the boards set every box's label. */
const BOX_LABEL = "text-label tracking-tight text-heading";

/** The 20px box with its mark, in its 20px slot. */
function Box({ invalid, className = "", ...input }: BoxProps) {
  return (
    <span className="relative flex h-5 shrink-0 items-center">
      <input
        type="checkbox"
        className={`${CHECKBOX} ${invalid ? CHECKBOX_ERROR : ""} ${className}`}
        {...input}
      />
      <Check
        size={14}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto hidden text-on-evergreen peer-checked:block"
      />
    </span>
  );
}

/** A drawing of an unticked box, for /texts. */
function PictureBox() {
  return (
    <span
      aria-hidden
      className="size-5 shrink-0 rounded-sm border border-line-field bg-surface"
    />
  );
}

/** Kept on one line, as G3 draws it, so a link never splits in two. */
function NewTabLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className={`${INLINE_LINK} whitespace-nowrap ${className}`}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  );
}

/**
 * "I agree to the Terms and have read the Privacy Policy." Inset 17px, so the
 * box lines up with the fields' text (`tasks/lessons.md`), with 8px more
 * space above it than the fields' gap.
 */
export function TermsRow({
  box,
  error,
}: {
  /** The real checkbox's props, or nothing for a picture. */
  box?: BoxProps;
  error?: string;
}) {
  const sentence = (
    <>
      I agree to the <NewTabLink href="/terms">Terms</NewTabLink> and have read
      the <NewTabLink href="/privacy">Privacy Policy</NewTabLink>.
    </>
  );
  const messageId = box ? `${box.id}-message` : undefined;

  return (
    <div className="flex flex-col gap-2 px-[17px] pt-2">
      <div className="flex items-start gap-3">
        {box ? (
          <Box
            {...box}
            invalid={Boolean(error)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
          />
        ) : (
          <PictureBox />
        )}
        {box ? (
          <label htmlFor={box.id} className={`cursor-pointer ${BOX_LABEL}`}>
            {sentence}
          </label>
        ) : (
          <p className={BOX_LABEL}>{sentence}</p>
        )}
      </div>
      {error ? (
        <p
          id={messageId}
          role="alert"
          className="flex items-start gap-2 pl-8 text-xs text-status-blocked-fg"
        >
          <WarningCircle size={18} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

const TEXTS_LINKS = [
  { href: "/texts", label: "How texting works" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy Policy" },
];

/**
 * "Text me about my home", in its own card, with the small print and its
 * links indented to the label (D-074). Its wording is `SMS_OPT_IN`'s.
 */
export function TextsBox({ box }: { box?: BoxProps }) {
  const smallPrintId = box ? `${box.id}-small-print` : undefined;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 pt-3.5 pb-4">
      <div className="flex items-start gap-3">
        {box ? (
          <Box {...box} aria-describedby={smallPrintId} />
        ) : (
          <PictureBox />
        )}
        {box ? (
          <label htmlFor={box.id} className={`cursor-pointer ${BOX_LABEL}`}>
            {SMS_OPT_IN.label}
          </label>
        ) : (
          <p className={BOX_LABEL}>{SMS_OPT_IN.label}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5 pl-8">
        <p id={smallPrintId} className="text-2xs leading-[17px] text-muted">
          {SMS_OPT_IN.smallPrint}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-2xs leading-[17px]">
          {TEXTS_LINKS.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 ? (
                <span aria-hidden className="text-line-field">
                  ·
                </span>
              ) : null}
              <NewTabLink href={link.href}>{link.label}</NewTabLink>
            </Fragment>
          ))}
        </p>
      </div>
    </div>
  );
}
