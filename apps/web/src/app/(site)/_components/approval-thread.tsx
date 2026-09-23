import { Bubble, Phone, PhoneContact, Thread, Timestamp } from "./phone";

/** The three facts the member is approving. Cost is the one that matters. */
const TERMS = [
  { label: "When", value: "Wednesday, 9:30 AM", strong: false },
  { label: "Cost", value: "$89 visit fee", strong: true },
  { label: "Card", value: "Single-use, this charge only", strong: false },
] as const;

/**
 * P5's visual: the approval sheet, with the thread blurred behind it.
 *
 * The blur is the point of the picture — the sheet is the only thing you can
 * act on, because nothing is booked and no money moves until the member says
 * yes (invariant 7). There is no composer here: the sheet covers it.
 */
export function ApprovalThread() {
  return (
    <Phone screenClassName="relative">
      <div className="hm-approval-thread flex flex-1 flex-col blur-[3px]">
        <PhoneContact />
        <Thread>
          <Timestamp>Today 9:10 AM</Timestamp>
          <Bubble from="member">The AC isn&rsquo;t cooling again</Bubble>
          <Bubble from="housemate">
            I compared three companies and their visit fees.
          </Bubble>
          <Bubble from="housemate">
            The best one can come Wednesday at 9:30. There&rsquo;s a visit fee,
            so I need your yes first.
          </Bubble>
        </Thread>
      </div>

      {/* Washes the thread back without hiding it, so the sheet has somewhere
          to sit. The blur alone leaves the bubbles too present. */}
      <div
        aria-hidden
        className="hm-approval-scrim absolute inset-0 bg-canvas/40"
      />

      <div className="hm-approval-rise absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-[20px] bg-surface px-5 pt-3 pb-6 shadow-[0_-8px_28px_rgba(20,52,47,0.12)]">
        <span className="mx-auto h-1 w-9 rounded-full bg-line-strong" />
        <div className="flex flex-col gap-3">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-nav px-2.5 py-1 text-2xs text-heading">
            <span className="size-1.5 rounded-full bg-evergreen" />
            Needs your approval
          </span>
          <p className="text-lead font-bold text-heading">
            Book the diagnostic visit
          </p>
          <dl className="flex flex-col gap-1.5">
            {TERMS.map((term) => (
              // `text-sm` is 700 in this system, so the rows opt back out and
              // only the cost carries the weight.
              <div key={term.label} className="flex gap-4 text-sm font-normal">
                <dt className="w-14 shrink-0 text-muted">{term.label}</dt>
                <dd
                  className={
                    term.strong ? "font-bold text-heading" : "text-body"
                  }
                >
                  {term.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-2">
          <span className="flex h-12 items-center justify-center rounded-lg bg-evergreen text-base font-bold text-on-evergreen">
            Approve $89
          </span>
          <span className="flex h-9 items-center justify-center text-label text-body">
            Not now
          </span>
        </div>
      </div>
    </Phone>
  );
}
