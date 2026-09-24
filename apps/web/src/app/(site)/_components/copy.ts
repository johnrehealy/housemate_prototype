/*
 * Every word on the landing page, in one place, taken from the approved Paper
 * boards (HOU-48). Changing a line here changes the page; changing it on the
 * board is what makes it approved.
 *
 * Nothing here may claim something that doesn't exist (D-061). The examples
 * are invented and generic: no real vendor, brand, price or customer, and the
 * browser card uses an example.com address on purpose.
 */

export const HERO = {
  /** Stays still while the second line rotates. */
  staticLine: "Every home needs",
  /**
   * The rotating line (board H4 r3). It loops through the jobs, about 2s a
   * phrase, and never names Housemate: the close does that (the user's note of
   * 2026-09-24). No phrase ends in a full stop: the line never finishes, so
   * none of them is the end of a sentence.
   *
   * Only the first is read aloud: the heading a screen reader hears is "Every
   * home needs someone to call the plumber", steady, however long the page is
   * open, and it is also the phrase reduced motion holds on.
   *
   * The hero's type is sized so the longest of these fits (see --text-hero in
   * globals.css). A longer phrase needs that sizing re-measured, and a
   * different number of phrases needs the hm-phrase keyframes rescaled.
   */
  phrases: [
    "someone to call the plumber",
    "someone to pick up the dry cleaning",
    "someone to pay the handyman",
    "someone to drop off returns",
    "someone to keep track of maintenance",
  ],
  learnMore: "Learn more",
} as const;

/*
 * `column` and `measure` are the round-4 boards' widths, in px, for the copy
 * beside a visual on a wide screen: the column sets where the visual starts,
 * and the measure is how wide the heading and body run, which on some boards
 * is a little wider than the column so the copy breaks into full lines. A
 * centred panel has only a measure. `bleed` runs the visual to the edge of the
 * page (P4's photograph).
 */
export const PANELS = [
  {
    id: "built",
    heading: "Built for busy homes",
    body: "Tell your Housemate what needs doing and it handles the rest, from scheduling the HVAC tune-up to dropping off your dry-cleaning. See what Housemate can do for you.",
    ground: "canvas",
    layout: "centered",
    measure: 720,
  },
  {
    id: "familiar",
    heading: "Designed to feel familiar",
    body: "Communicate with your Housemate the way you would anyone else. Send a request over text, share a photo of the leak, or send a voice note about that weird noise.",
    ground: "nav",
    layout: "visual-first",
    column: 493,
    measure: 493,
  },
  {
    id: "equipped",
    heading: "Equipped to deliver",
    body: "Every Housemate runs on its own secure computer in the cloud, with a full browser it uses to get real work done. Hand off a task and it can compare quotes, book appointments and chase down that contractor who hasn't called you back, without you having to hold its hand.",
    ground: "canvas",
    layout: "copy-first",
    column: 460,
    measure: 504,
  },
  {
    id: "people",
    heading: "Supported by real people",
    body: "Some jobs need more than a browser. Housemate's local team handles the physical stuff, like dropping off a package return, or meeting a contractor at your door while you're at work. Your Housemate plans it and the local team gets it done.",
    ground: "nav",
    layout: "visual-first",
    column: 460,
    measure: 460,
    bleed: true,
  },
  {
    id: "control",
    heading: "Controlled by you",
    body: "Approve anything that matters before it happens, like booking a service, sending a message on your behalf, or spending money. Everything Housemate has done, and everything it's planning to do, lives in one clear timeline in the app. Nothing happens without your say-so.",
    ground: "canvas",
    layout: "copy-first",
    column: 460,
    measure: 523,
  },
  {
    id: "private",
    heading: "Your home is your business",
    body: "Your logins go into a secure credential store Housemate can't see, and purchases use a one-time card number so your real card stays private. Housemate never sells your data, never takes referral fees to steer your choices, and never shows you ads.",
    ground: "nav",
    layout: "visual-first",
    column: 460,
    measure: 481,
  },
] as const;

export const CLOSE = {
  /*
   * One line where it fits, with the same two tones as the hero: the page
   * ends by answering the hero's "Every home needs someone to…". No lead
   * under it — the button follows the heading directly (the user's note of
   * 2026-09-24).
   */
  headingStart: "Every home deserves",
  headingEnd: "a Housemate",
  /*
   * No privacy, terms or contact link. The boards draw them, but none of those
   * pages exists and D-061 says there is no link until one does (HOU-50).
   */
  copyright: "© 2026 Housemate",
} as const;
