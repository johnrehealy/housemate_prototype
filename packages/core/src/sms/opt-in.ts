/**
 * What a member agrees to when they first join (D-067), word for word.
 *
 * The welcome step after an invited member's first sign-in shows `label`
 * beside an unticked box with `text` under it. It's shown once: finishing the
 * step activates the member, and active members never see it again. The
 * consent record stores the label and text with the version, so what we can
 * prove someone agreed to is exactly what they saw. Changing the wording means
 * a new version: records keep the version they were made under, and a page
 * rendered before the change is refused rather than recorded against wording
 * it didn't show.
 *
 * The box is optional, as Twilio requires (30923, 30931): a member can go on
 * without it. Sign-in codes aren't listed because they come from Twilio
 * Verify, outside this program (D-049), and arrive whether or not the box is
 * ticked.
 *
 * Twilio's reviewers read this wording in the campaign's message flow, and on
 * the public /texts page, so it names the sender, what's sent, frequency,
 * rates, STOP and HELP, and that consent is optional. The Privacy Policy and
 * Terms links sit right after it.
 *
 * Kept free of imports, so pages can read it without pulling in the rest of
 * the package.
 */
export const SMS_OPT_IN = {
  version: "2026-09-28",
  label: "Send me texts about my home (optional)",
  text: "I agree to receive recurring text messages from Housemate, operated by John Healy, at the mobile number I signed in with: replies to my requests, reminders, appointment updates, and follow-ups on bookings and payments. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time, or HELP for help. You can use Housemate without agreeing, and consent is not a condition of any purchase.",
} as const;

/** The one text a member gets after opting in, named in the campaign too. */
export const OPT_IN_CONFIRMATION =
  "Housemate (John Healy): You're signed up for texts about your home. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";
