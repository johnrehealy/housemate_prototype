import {
  STATE_LABEL,
  earlierOpenLabel,
  emptyAlertsText,
  emptyCostsText,
  formatCount,
  formatRaisedAt,
  formatUsd,
  memberNote,
  monthName,
  teamLabel,
  type AlertIcon,
  type AlertRow,
  type AlertState,
  type CostReport,
  type CostRow,
} from "@housemate/core/costs";
import type { Icon } from "@phosphor-icons/react";
import {
  ChatCircleText,
  Phone,
  Receipt,
  Wallet,
  Warning,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";

const ICONS: Record<AlertIcon, Icon> = {
  receipt: Receipt,
  chat: ChatCircleText,
  wallet: Wallet,
  warning: Warning,
};

/** Status chip colours (docs/design.md, Chips), by what the state asks of staff. */
const CHIP: Record<AlertState, string> = {
  needs_look: "bg-status-action-bg text-status-action-fg",
  flagged: "bg-status-idle-bg text-status-idle-fg",
  resolved: "bg-status-done-bg text-status-done-fg",
};

const SECTION_LABEL = "text-xs tracking-wide text-muted uppercase";
const HEAD = "h-9 pl-3 text-left text-xs font-normal text-muted";
const EMPTY_ROW =
  "mt-3 flex h-(--spacing-row) items-center border-y border-line text-sm font-normal text-muted";

export function AlertsSection({
  report,
  current,
}: {
  report: CostReport;
  current: string;
}) {
  const name = monthName(report.month);
  const earlier = report.earlierOpen;
  const latest = earlier?.months[0];

  return (
    <section aria-labelledby="alerts-heading" className="pt-12">
      <div className="flex h-5 items-center justify-between">
        <h2 id="alerts-heading" className={SECTION_LABEL}>
          Alerts in {name} ({report.alertCount})
        </h2>
        <div className="flex items-center gap-4 text-xs">
          {earlier && latest && (
            <Link
              href={
                latest === current ? "/ops/costs" : `/ops/costs?month=${latest}`
              }
              className="text-evergreen underline decoration-1 underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
            >
              {earlierOpenLabel(earlier, report.month)}
            </Link>
          )}
          {report.alerts.length > 0 && (
            <p className="text-muted">Times in UTC</p>
          )}
        </div>
      </div>
      {report.alerts.length === 0 ? (
        <p className={EMPTY_ROW}>{emptyAlertsText(report)}</p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-7" />
            <col />
            <col className="w-40" />
            <col className="w-35" />
            <col className="w-35" />
          </colgroup>
          <thead>
            <tr className="border-b border-line">
              <td />
              <th scope="col" className={HEAD}>
                Alert
              </th>
              <th scope="col" className={HEAD}>
                State
              </th>
              <th scope="col" className={HEAD}>
                Team
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                Raised
              </th>
            </tr>
          </thead>
          <tbody>
            {report.alerts.map((row) => (
              <AlertLine key={row.key} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function AlertLine({ row }: { row: AlertRow }) {
  const RowIcon = ICONS[row.icon];
  const reached = row.team === "texted";
  return (
    <tr className="h-16 border-b border-line">
      <td>
        <span className="flex size-(--spacing-icon-lg) items-center justify-center text-muted">
          <RowIcon size={20} aria-hidden />
        </span>
      </td>
      <td className="pl-3">
        <p className="text-sm font-normal text-body">{row.title}</p>
        <p className="mt-0.5 text-xs text-muted">{row.detail}</p>
      </td>
      <td className="pl-3">
        <span
          className={`inline-flex h-[26px] items-center rounded-full px-[11px] text-xs leading-[18px] ${CHIP[row.state]}`}
        >
          {STATE_LABEL[row.state]}
        </span>
      </td>
      <td
        className={`pl-3 text-xs ${reached ? "text-muted" : "text-status-action-fg"}`}
      >
        {teamLabel(row.team)}
      </td>
      <td className="pl-3 text-right text-xs text-muted">
        <time dateTime={row.raisedAt.toISOString()}>
          {formatRaisedAt(row.raisedAt)}
        </time>
      </td>
    </tr>
  );
}

const NUMBER = "pl-3 text-right text-sm font-normal tabular-nums";

export function MembersSection({ report }: { report: CostReport }) {
  const split = report.hasClaude;
  const rows = report.outside
    ? [...report.members, report.outside]
    : report.members;
  const note = memberNote(report);

  return (
    <section aria-labelledby="members-heading" className="pt-12 pb-16">
      {split ? (
        <div className="flex h-6 items-end gap-3">
          <h2
            id="members-heading"
            className={`flex-1 pb-[5px] ${SECTION_LABEL}`}
          >
            By member
          </h2>
          <p
            aria-hidden
            className="w-[408px] shrink-0 border-b border-line pb-1 text-center text-xs text-muted"
          >
            Cost
          </p>
        </div>
      ) : (
        <div className="flex h-5 items-center">
          <h2 id="members-heading" className={SECTION_LABEL}>
            By member
          </h2>
        </div>
      )}
      {rows.length === 0 ? (
        <p className={EMPTY_ROW}>{emptyCostsText(report)}</p>
      ) : (
        <>
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-7" />
              <col />
              <col className="w-30" />
              <col className="w-35" />
              {split && <col className="w-35" />}
              {split && <col className="w-35" />}
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <td />
                <th scope="col" className={HEAD}>
                  Member
                </th>
                <th scope="col" className={`${HEAD} text-right`}>
                  Texts
                </th>
                {split ? (
                  <>
                    <th scope="col" className={`${HEAD} text-right`}>
                      Twilio<span className="sr-only"> cost</span>
                    </th>
                    <th scope="col" className={`${HEAD} text-right`}>
                      Claude<span className="sr-only"> cost</span>
                    </th>
                    <th scope="col" className={`${HEAD} text-right`}>
                      Total<span className="sr-only"> cost</span>
                    </th>
                  </>
                ) : (
                  <th scope="col" className={`${HEAD} text-right`}>
                    Cost
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <MemberLine
                  key={row.memberId ?? "outside"}
                  row={row}
                  split={split}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="h-(--spacing-row) border-t border-heading text-heading">
                <td />
                <th scope="row" className="pl-3 text-left text-sm font-normal">
                  Total
                </th>
                <td className={NUMBER}>{formatCount(report.totals.texts)}</td>
                {split && (
                  <>
                    <td className={NUMBER}>
                      {formatUsd(report.totals.twilioUsd)}
                    </td>
                    <td className={NUMBER}>
                      {formatUsd(report.totals.claudeUsd)}
                    </td>
                  </>
                )}
                <td className={NUMBER}>{formatUsd(report.totals.totalUsd)}</td>
              </tr>
            </tfoot>
          </table>
          {note && <p className="pt-3 text-xs text-muted">{note}</p>}
        </>
      )}
    </section>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MemberLine({ row, split }: { row: CostRow; split: boolean }) {
  const outside = row.memberId === null;
  return (
    <tr className="h-(--spacing-row) border-b border-line last:border-b-0">
      <td>
        {outside ? (
          <span className="flex size-(--spacing-icon-lg) items-center justify-center text-muted">
            <Phone size={20} aria-hidden />
          </span>
        ) : (
          <span
            aria-hidden
            className="flex size-(--spacing-icon-lg) items-center justify-center rounded-full bg-evergreen text-2xs font-bold text-on-evergreen"
          >
            {initials(row.name)}
          </span>
        )}
      </td>
      <th scope="row" className="pl-3 text-left text-sm font-normal text-body">
        {row.name}
      </th>
      <td className={`${NUMBER} text-body`}>{formatCount(row.texts)}</td>
      {split && (
        <>
          <td className={`${NUMBER} text-body`}>{formatUsd(row.twilioUsd)}</td>
          <td className={`${NUMBER} ${outside ? "text-muted" : "text-body"}`}>
            {outside ? (
              <>
                <span aria-hidden>—</span>
                <span className="sr-only">None</span>
              </>
            ) : (
              formatUsd(row.claudeUsd)
            )}
          </td>
        </>
      )}
      <td className={`${NUMBER} text-heading`}>{formatUsd(row.totalUsd)}</td>
    </tr>
  );
}
