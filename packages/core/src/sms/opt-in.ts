/**
 * What a member agrees to by ticking G3's "Text me about my home" box on Get
 * started (D-074), word for word.
 *
 * The box appears only once a mobile number is typed, below the Terms box,
 * with `label` beside it and `smallPrint` under it. The consent record stores
 * both with the version, so what we can prove someone agreed to is exactly
 * what they saw. Changing the wording means a new version: records keep the
 * version they were made under, and a page rendered before the change is
 * refused rather than recorded against wording it didn't show.
 *
 * The box is optional and starts unticked, as Twilio requires (30923, 30931):
 * someone can join without it, and their number then gets only sign-in codes.
 * Those codes come from Twilio Verify, outside this program (D-049, D-073), so
 * they aren't listed here.
 *
 * Twilio's reviewers read this wording in the campaign's message flow, and on
 * the public /texts page, so it names the sender, what's sent, frequency,
 * rates, STOP and HELP, and that texting is optional. The links to how texting
 * works, the Terms and the Privacy Policy sit under it.
 *
 * Kept free of imports, so pages can read it without pulling in the rest of
 * the package.
 */
export const SMS_OPT_IN = {
  version: "2026-10-02",
  label: "Text me about my home",
  smallPrint:
    "By ticking this, you agree to get texts from Housemate, operated by John Healy, about your home: replies, reminders and updates. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Texting is optional.",
} as const;

/** The one text a member gets after opting in, named in the campaign too. */
export const OPT_IN_CONFIRMATION =
  "Housemate (John Healy): You're signed up for texts about your home. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";
