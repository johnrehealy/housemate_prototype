import {
  CheckCircle,
  DeviceMobile,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/brand";

/*
 * The evergreen half of the sign-in page (docs/design.md §4 Sign-in page,
 * D-036 for the 600px version and D-056 for the 400px one). It's hidden below
 * --breakpoint-lg: on a phone the member is arriving from a text, so they
 * already know what Housemate is.
 *
 * On-evergreen is used at three strengths, which the design fixes as opacities
 * of --color-on-evergreen rather than as new colors: 74% for the lead and the
 * row bodies (7.8:1), 62% for the invite note (6.0:1), and 16% for the row
 * hairlines.
 */

const ROWS = [
  {
    icon: DeviceMobile,
    title: "Text Housemate anytime",
    body: "Need a plumber, a handyman, or your dry cleaning picked up? Send a message like you would to a person.",
  },
  {
    icon: Wrench,
    title: "Housemate takes it from there",
    body: "Whether it’s coordinating vendors, managing payments, or running an errand, if it’s part of running your home, Housemate can do it too.",
  },
  {
    icon: CheckCircle,
    title: "Everything shows up here",
    body: "Appointments, records, reminders and past work all live in the app, so you always know what’s going on.",
  },
] as const;

export function StoryPanel() {
  return (
    // No h-full: the row already stretches this to full height, and an
    // explicit height:100% resolves against an auto-height parent and
    // collapses back to the content.
    <div className="hidden w-[400px] shrink-0 flex-col justify-between bg-evergreen pt-[22px] pb-10 pl-10 pr-10 text-on-evergreen lg:flex xl:w-[600px] xl:px-16 xl:pb-14">
      {/*
       * self-start, or the column stretches the <svg> box to the panel's full
       * inner width and preserveAspectRatio centres the artwork inside it.
       * The box measures as starting at the left padding either way, so this
       * is only visible in a screenshot.
       */}
      <Wordmark className="h-5 w-auto self-start" label={null} />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          {/*
           * A paragraph, not a heading: it comes before the page's <h1>
           * ("Sign in") in the DOM, and a screen reader reading h2-then-h1
           * would suggest a structure this page doesn't have.
           */}
          <p className="max-w-[480px] text-display">
            Every home needs a Housemate.
          </p>
          <p className="max-w-[420px] text-lead text-on-evergreen/74">
            Repairs, services, errands and upkeep, all in one place. Tell
            Housemate what you need and it gets to work.
          </p>
        </div>

        <ul className="flex max-w-[472px] flex-col">
          {ROWS.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className={`flex gap-4 border-t border-on-evergreen/16 py-[18px] ${
                index === ROWS.length - 1
                  ? "border-b border-b-on-evergreen/16"
                  : ""
              }`}
            >
              <Icon
                size={20}
                weight="regular"
                aria-hidden
                className="shrink-0 text-on-evergreen/74"
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm">{title}</p>
                <p className="text-sm font-normal text-on-evergreen/74">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="max-w-[420px] text-xs text-on-evergreen/62">
        Housemate is currently invite-only
      </p>
    </div>
  );
}
