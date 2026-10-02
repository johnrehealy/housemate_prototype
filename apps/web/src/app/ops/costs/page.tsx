import {
  budgetCaption,
  formatUsd,
  getCostReport,
  monthLabel,
  monthName,
  monthOf,
  parseMonth,
  periodCaption,
  unreachedNotice,
  type CostReport,
} from "@housemate/core/costs";
import { BellSlash, CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { serverDb } from "@/lib/server-context";
import { AlertsSection, MembersSection } from "./tables";

export const metadata: Metadata = { title: "Costs" };

/**
 * What the pilot is spending, one budget month at a time (D-030 as revised:
 * the $100 is the whole pilot's). Built from the approved boards O1–O3 r2,
 * Paper page "Ops".
 */
export default async function CostsPage({
  searchParams,
}: PageProps<"/ops/costs">) {
  await requireStaff();

  const now = new Date();
  const current = monthOf(now);
  const asked = parseMonth((await searchParams).month);
  // A month still to come has nothing in it; show this one instead.
  const month = asked && asked <= current ? asked : current;
  const report = await getCostReport(serverDb(), { month, now });

  return (
    <>
      <Toolbar report={report} current={current} />
      {report.unreached && (
        <div className="pb-4">
          <p className="flex items-center gap-3 rounded-lg bg-status-action-bg px-5 py-3.5 text-sm font-normal text-status-action-fg">
            <BellSlash size={20} aria-hidden className="shrink-0" />
            {unreachedNotice(report.unreached)}
          </p>
        </div>
      )}
      <Figures report={report} />
      <BudgetBar report={report} />
      <AlertsSection report={report} current={current} />
      <MembersSection report={report} />
    </>
  );
}

function monthHref(month: string, current: string): string {
  return month === current ? "/ops/costs" : `/ops/costs?month=${month}`;
}

const STEP =
  "flex size-(--spacing-hit) shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-120 ease-out hover:bg-nav-hover hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen";

function Toolbar({ report, current }: { report: CostReport; current: string }) {
  const { previousMonth, nextMonth } = report;
  return (
    <div className="flex h-(--spacing-toolbar) items-center justify-between">
      <h1 className="text-lead text-body">What the pilot is spending</h1>
      <nav aria-label="Month" className="flex items-center gap-0.5">
        {previousMonth ? (
          <Link
            href={monthHref(previousMonth, current)}
            aria-label={`Previous month, ${monthLabel(previousMonth)}`}
            className={STEP}
          >
            <CaretLeft size={20} aria-hidden />
          </Link>
        ) : (
          <span className="size-(--spacing-hit) shrink-0" />
        )}
        <p className="flex h-(--spacing-hit) w-34 items-center justify-center text-label text-body">
          {monthLabel(report.month)}
        </p>
        {nextMonth ? (
          <Link
            href={monthHref(nextMonth, current)}
            aria-label={`Next month, ${monthLabel(nextMonth)}`}
            className={STEP}
          >
            <CaretRight size={20} aria-hidden />
          </Link>
        ) : (
          <span className="size-(--spacing-hit) shrink-0" />
        )}
      </nav>
    </div>
  );
}

function Figure({
  label,
  value,
  alarm = false,
}: {
  label: string;
  value: string;
  alarm?: boolean;
}) {
  const tone = alarm ? "text-status-action-fg" : "";
  return (
    <div className="flex flex-1 flex-col justify-center gap-1.5 px-5">
      <dt className={`text-sm font-normal ${tone || "text-muted"}`}>{label}</dt>
      <dd className={`text-metric ${tone || "text-evergreen"}`}>{value}</dd>
    </div>
  );
}

function Figures({ report }: { report: CostReport }) {
  const name = monthName(report.month);
  const budget = formatUsd(report.budgetUsd, { whole: true });
  const over = report.totalUsd > report.budgetUsd;
  return (
    <dl className="flex h-[110px] gap-1 rounded-lg bg-nav p-1">
      <Figure label={`Spent in ${name}`} value={formatUsd(report.totalUsd)} />
      {over ? (
        <Figure
          label={`Over the ${budget} budget`}
          value={`+${formatUsd(report.totalUsd - report.budgetUsd)}`}
          alarm
        />
      ) : (
        <Figure
          label={`Left of the ${budget} budget`}
          value={formatUsd(report.budgetUsd - report.totalUsd)}
        />
      )}
      <Figure label={`Alerts in ${name}`} value={String(report.alertCount)} />
    </dl>
  );
}

/**
 * Spending against the budget. Past the budget, the whole track stands for
 * what was spent, the overage is drawn in rust, and a mark shows where the
 * budget ran out. The captions carry the same facts in words, so the drawing
 * is hidden from screen readers.
 */
function BudgetBar({ report }: { report: CostReport }) {
  const { totalUsd, budgetUsd } = report;
  const over = totalUsd > budgetUsd;
  const budgetShare = over ? (budgetUsd / totalUsd) * 100 : 100;
  const spentShare = over ? 100 : (totalUsd / budgetUsd) * 100;

  return (
    <div className={`relative flex flex-col gap-2 ${over ? "pt-6" : "pt-4"}`}>
      <div
        aria-hidden
        className="flex h-2 overflow-clip rounded-full bg-line-strong"
      >
        {over ? (
          <>
            <div
              className="h-full bg-evergreen"
              style={{ width: `${budgetShare}%` }}
            />
            <div className="h-full flex-1 bg-status-action-fg" />
          </>
        ) : (
          <div
            className="h-full rounded-full bg-evergreen"
            style={{ width: `${spentShare}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <p>{budgetCaption(report)}</p>
        <p>{periodCaption(report)}</p>
      </div>
      {over && (
        <>
          <span
            aria-hidden
            className="absolute top-5 h-4 w-0.5 bg-heading"
            style={{ left: `calc(${budgetShare}% - 1px)` }}
          />
          <span
            aria-hidden
            className="absolute top-0 w-9 text-center text-xs text-heading"
            // Kept inside the track when the overage is a sliver.
            style={{
              left: `min(calc(${budgetShare}% - 18px), calc(100% - 36px))`,
            }}
          >
            {formatUsd(budgetUsd, { whole: true })}
          </span>
        </>
      )}
    </div>
  );
}
