import { Bubble, Phone, PhoneContact, Thread, Timestamp } from "./phone";

/** The three facts the member is approving. Cost is the one that matters. */
const TERMS = [
  { label: "When", value: "Wednesday, 9:30 AM", strong: false },
  { label: "Cost", value: "$89 visit fee", strong: true },
  { label: "Card", value: "Single-use, this charge only", strong: false },
] as const;

/**
 * P5's visual: the approval, lifted clear of the thread blurred behind it.
 *
 * The approval is the point of the picture — nothing is booked and no money
 * moves until the member says yes (invariant 7) — so it is the one thing on
 * the page that leaves its phone entirely: wider than the screen and in front
 * of it. It sits outside the phone for that reason, anchored to the phone's
 * foot; the phone itself clips, so the blur stays inside its edge.
 */
export function ApprovalThread() {
  return (
    <div aria-hidden className="relative w-[372px] max-w-full shrink-0">
      <Phone className="relative overflow-clip">
        <div className="hm-approval-thread flex flex-1 flex-col blur-[3px]">
          <PhoneContact />
          <Thread>
            <Timestamp>Today 9:14 AM</Timestamp>
            <Bubble from="member">The AC isn&rsquo;t cooling again.</Bubble>
            <Bubble from="housemate">
              I compared three companies and their visit fees.
            </Bubble>
            <Bubble from="housemate">
              The best one can come Wednesday at 9:30. There&rsquo;s a visit
              fee, so I need your yes first.
            </Bubble>
          </Thread>
        </div>

        {/* Washes the thread back without hiding it. The blur alone leaves
            the bubbles too present behind the card. */}
        <div className="hm-approval-scrim absolute inset-0 bg-canvas/52" />
      </Phone>

      <div className="hm-approval-rise absolute -inset-x-3 bottom-10 flex flex-col gap-3.5 rounded-[24px] border border-line bg-surface px-4 py-[22px] shadow-lift sm:-inset-x-6 xl:right-auto xl:-left-[82px] xl:w-[420px]">
        <div className="flex flex-col items-start gap-2">
          <span className="flex items-center gap-[5px] rounded-full bg-evergreen/8 px-[9px] py-[3px] text-2xs font-bold tracking-[0.005em] text-evergreen">
            <span className="size-1.5 rounded-full bg-evergreen" />
            Needs your approval
          </span>
          <p className="text-lead leading-6 font-bold tracking-[-0.015em] text-heading">
            Book the diagnostic visit
          </p>
        </div>
        <dl className="flex flex-col gap-[9px]">
          {TERMS.map((term) => (
            <div key={term.label} className="flex items-baseline gap-3 text-xs">
              <dt className="w-[52px] shrink-0 text-muted">{term.label}</dt>
              <dd
                className={term.strong ? "font-bold text-heading" : "text-body"}
              >
                {term.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2.5">
          <span className="flex h-11 items-center justify-center rounded-lg bg-evergreen text-label font-bold tracking-[-0.005em] text-on-evergreen">
            Approve $89
          </span>
          {/* `text-sm` is 700 in this system, which is what the board draws. */}
          <span className="self-center text-sm text-muted">Not now</span>
        </div>
      </div>
    </div>
  );
}
