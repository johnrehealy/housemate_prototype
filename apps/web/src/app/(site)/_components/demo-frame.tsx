import { DemoVideo } from "./demo-video";

/**
 * P1's visual: the demo video (HOU-53; boards "r5 · P1").
 *
 * Two cuts of one film. From md the 16:9 film plays in the board's 2:1 frame,
 * which crops only margin: its captions and screens sit inside y 60–1020.
 * Below md its captions would shrink under 12px, so the 4:5 phone cut takes
 * over, with each caption set above the product at a size a phone can read.
 * Whichever cut is hidden never loads (see `DemoVideo`).
 *
 * Every beat of the story is carried by on-screen text and the music is
 * incidental, so the video's text alternative is that text, with the scenes
 * it sits over. It is `hidden`: a description is read out when the video is
 * reached, and hiding it keeps it from being read a second time as page copy.
 */

const STORY_ID = "demo-video-story";

const STORY = [
  "Running a home is a lot of work: chores pile up, from calling the plumber to returning a package. But what if it didn't need to be?",
  "Housemate, a companion for running your home.",
  "Just text your Housemate. No need to log in to an app. Just tell Housemate what you need, from scheduling a plumber to picking up your dry cleaning. Sam texts that the kitchen sink is leaking.",
  "Then let Housemate get to work. It researches the problem, finds the right provider (or uses your own) and coordinates the details without you needing to babysit. It compares three plumbers' sites in its own browser.",
  "It brings you in when needed. So you have final say over things like availability and cost, without having to drown in the weeds. It asks Sam to approve a visit fee, then books Wednesday at 9:30.",
  "Real people when you need them. Housemate's local team can even meet a technician, make a return or pick something up from your doorstep.",
  "It builds an understanding of your home. Appliances, service history, maintenance needs and trusted vendors, so every task gets easier over time. A photo of the furnace's label becomes a record of it.",
  "Everything comes together in one collaborative portal. See what's happening, jump into a task, or leave it to Housemate to keep things moving.",
  "So you always stay in control. Increased transparency and flexibility allow you to delegate or take control, depending on what works best for you. The plumber's visit on the calendar traces back to Sam's text.",
  "Because every home needs someone to call the plumber, someone to pick up the dry cleaning: Housemate.",
];

export function DemoFrame() {
  return (
    <>
      <DemoVideo
        hevc="/site/demo/phone-hevc.mp4"
        h264="/site/demo/phone-h264.mp4"
        poster="/site/demo/phone-poster.jpg"
        className="aspect-4/5 w-full md:hidden"
        stacked
        describedBy={STORY_ID}
      />
      <DemoVideo
        hevc="/site/demo/film-hevc.mp4"
        h264="/site/demo/film-h264.mp4"
        poster="/site/demo/film-poster.jpg"
        className="hidden aspect-2/1 w-full md:block"
        describedBy={STORY_ID}
      />
      <div id={STORY_ID} hidden>
        {STORY.map((beat) => (
          <p key={beat}>{beat}</p>
        ))}
      </div>
    </>
  );
}
