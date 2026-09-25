import Link from "next/link";
import type { ReactNode } from "react";
import { Contents } from "./contents";
import type { OutlineItem } from "./outline";

/*
 * The pieces the legal pages are written in (boards L1–L3 in Paper, page
 * "Legal"; L2 for narrow). Each value is the board's. The switch from the
 * narrow sizes to the wide ones is at sm, as it is for the landing page's
 * marketing sizes; the layout itself goes to two columns at xl.
 */

/** Running text: 16/26 on a phone, 17/28 from sm. */
const BODY = "text-base leading-6.5 text-body sm:text-lead sm:leading-7";
/** Text inside cards and tables, which stays at 16/26. */
const SMALL_BODY = "text-base leading-6.5 text-body";
const EYEBROW = "text-2xs uppercase tracking-wide text-muted sm:text-xs";
const CARD_TITLE =
  "font-serif text-[22px] leading-[30px] tracking-tight sm:text-[24px] sm:leading-8";

/** The title band under the ribbon. */
export function Masthead({
  title,
  lead,
  effective,
  updated = effective,
  leadWidth = 660,
}: {
  title: string;
  lead: ReactNode;
  /** When this version took effect, and when it was last changed. */
  effective?: string;
  updated?: string;
  leadWidth?: number;
}) {
  const dates = !effective
    ? null
    : updated === effective
      ? `Effective and last updated ${effective}`
      : `Effective ${effective} · Last updated ${updated}`;

  return (
    <header className="flex flex-col gap-4 border-b border-line px-6 pt-12 pb-10 lg:gap-5 lg:px-30 lg:pt-24 lg:pb-16">
      {dates && <p className={EYEBROW}>{dates}</p>}
      <h1 className="font-serif text-close-narrow text-evergreen sm:text-close">
        {title}
      </h1>
      <p
        className="text-base text-body sm:text-lead"
        style={{ maxWidth: leadWidth }}
      >
        {lead}
      </p>
    </header>
  );
}

/**
 * The contents beside the text, and the text. From xl the two columns are the
 * board's 260 and 660; the gap between them is the board's 160 at 1440 and
 * gives way first as the window narrows, down to 120 at 1280.
 */
export function LegalDocument({
  sections,
  children,
}: {
  sections: readonly OutlineItem[];
  children: ReactNode;
}) {
  return (
    <div className="px-6 pb-16 lg:px-30 lg:pb-30 xl:grid xl:grid-cols-[260px_minmax(0,660px)] xl:gap-x-[min(160px,calc(100vw_-_1160px))] xl:pt-16">
      <Contents items={sections} />
      <article className="max-w-(--container-thread) pt-2 xl:pt-0">
        {children}
      </article>
    </div>
  );
}

/** What comes before Section 1: who the parties are, and what applies. */
export function Preamble({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pt-10 sm:gap-5 sm:pt-12">
      {children}
    </div>
  );
}

/** A numbered section, as the contents list names it. */
export function Section({
  id,
  number,
  title,
  children,
}: OutlineItem & { children: ReactNode }) {
  return (
    // The anchor lands the heading just under whatever is stuck above it:
    // the ribbon and the contents bar below xl, the ribbon alone from xl.
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex scroll-mt-[124px] flex-col gap-4 pt-10 sm:gap-5 sm:pt-18 xl:scroll-mt-6"
    >
      <div className="flex flex-col gap-1 pb-1 sm:gap-1.5">
        <p className={EYEBROW}>Section {number}</p>
        <h2
          id={`${id}-heading`}
          className="font-serif text-[26px] leading-[34px] tracking-tight text-evergreen sm:text-[32px] sm:leading-10"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** A numbered part of a section, such as "2.3". */
export function Subsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 pt-6 sm:gap-3.5 sm:pt-8">
      <h3 className="font-serif text-[20px] leading-7 tracking-tight text-heading sm:text-[22px] sm:leading-[30px]">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className={BODY}>{children}</p>;
}

/** A bold lead-in, or a phrase that has to be found at a glance. */
export function B({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-heading">{children}</strong>;
}

/** A link in running text: a page on this site, an email address or a URL. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const className =
    "rounded-sm text-evergreen underline decoration-1 underline-offset-4 transition-[text-decoration-thickness] duration-120 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen";
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const SUPPORT_EMAIL = "john@myhousemate.co";

/** The support address, as a link that opens a message to it. */
export function Email({ subject }: { subject?: string }) {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return <A href={`mailto:${SUPPORT_EMAIL}${query}`}>{SUPPORT_EMAIL}</A>;
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2.5 pl-1">{children}</ul>;
}

/** A point in a bulleted list: a 6px evergreen dot on the first line. */
export function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span
        aria-hidden
        className="relative top-2.5 size-1.5 shrink-0 rounded-full bg-evergreen sm:top-[11px]"
      />
      <div className={`min-w-0 flex-1 ${BODY}`}>{children}</div>
    </li>
  );
}

/** A list whose order matters, or whose items are referred to by number. */
export function Numbered({ children }: { children: ReactNode }) {
  return (
    <ol
      className={`flex list-decimal flex-col gap-2.5 pl-6 marker:font-bold marker:text-evergreen ${BODY}`}
    >
      {children}
    </ol>
  );
}

/** "The short version": the nav-ground card that opens a document. */
export function Summary({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="short-version"
      className="flex flex-col gap-5 rounded-xl bg-nav px-5 py-6 sm:px-9 sm:py-8"
    >
      <h2 id="short-version" className={`${CARD_TITLE} text-evergreen`}>
        The short version
      </h2>
      <ul className="flex flex-col gap-5">{children}</ul>
    </section>
  );
}

export function SummaryPoint({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1">
      <p className="text-base font-bold text-heading">{title}</p>
      <p className="text-base text-body">{children}</p>
    </li>
  );
}

/**
 * The evergreen card that states a messaging program's terms in one place
 * (board L1, "at a glance"). Wide, each row is a 140px label beside its value;
 * on a phone the label sits above.
 */
export function Glance({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="at-a-glance"
      className="rounded-xl bg-evergreen px-5 pt-6 pb-2 sm:px-9 sm:pt-9 sm:pb-5 [&_a]:text-on-evergreen [&_a:focus-visible]:outline-on-evergreen"
    >
      <h3
        id="at-a-glance"
        className={`pb-4 sm:pb-5 ${CARD_TITLE} text-on-evergreen`}
      >
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

export function GlanceRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-on-evergreen/16 py-3 last:pb-4 sm:flex-row sm:gap-6 sm:py-3.5 sm:last:pb-4">
      <dt className="text-xs text-on-evergreen/72 sm:w-35 sm:shrink-0 sm:text-label sm:leading-6">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-base text-on-evergreen">{children}</dd>
    </div>
  );
}

/** Rows of a label beside what it names, ruled top and bottom (board L1, 2.3). */
export function Rows({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col border-t border-line">{children}</dl>;
}

export function Row({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-line py-3.5 sm:flex-row sm:items-start sm:gap-6 sm:py-4">
      <dt className="text-xs text-muted sm:w-35 sm:shrink-0 sm:text-label sm:leading-7">
        {label}
      </dt>
      <dd className={`flex min-w-0 flex-1 flex-col gap-2.5 ${SMALL_BODY}`}>
        {children}
      </dd>
    </div>
  );
}

/**
 * Words a member can text, set as keys. The first is the one to remember and
 * is drawn in evergreen; the rest work the same.
 */
export function Keywords({ words }: { words: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {words.map((word, index) => (
        <li key={word}>
          <kbd
            className={`block rounded-sm border px-2 py-[3px] font-sans text-xs tracking-wide ${
              index === 0
                ? "border-evergreen font-bold text-evergreen"
                : "border-line-strong text-heading"
            }`}
          >
            {word}
          </kbd>
        </li>
      ))}
    </ul>
  );
}

/** A caution the reader shouldn't miss, on the action ground. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-status-action-bg px-5 py-4 text-base leading-6.5 text-status-action-fg">
      {children}
    </div>
  );
}

/** A promise stated once, large, with its detail under it (board L1, 2.7). */
export function Pledge({
  statement,
  children,
}: {
  statement: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-l-2 border-evergreen py-1 pl-6">
      <p className="font-serif text-[20px] leading-7 tracking-tight text-evergreen sm:text-[22px] sm:leading-8">
        {statement}
      </p>
      <p className={SMALL_BODY}>{children}</p>
    </div>
  );
}
