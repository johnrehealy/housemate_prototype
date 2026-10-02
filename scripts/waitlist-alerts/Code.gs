/**
 * Housemate's Apps Script: waitlist alerts and member emails.
 *
 * Paste this into the "Housemate Alpha Waitlist" sheet's Apps Script (Extensions →
 * Apps Script) and deploy it as a web app; README.md beside it has the steps.
 * The web app posts one of three events here (packages/core/src/apps-script.ts):
 *
 * - "waitlist.joined" (packages/core/src/alerts): adds a row to the "Alpha
 *   Waitlist" tab and emails the sheet's owner.
 * - "member.let_in" (packages/core/src/mail): emails E1, "A spot opened up",
 *   with the person's Get started link (D-072).
 * - "member.code" (packages/core/src/mail): emails E2, a sign-in code (D-073).
 *
 * The member emails touch no sheet row. Their link and code are never logged,
 * and neither email says anything about the person's home.
 *
 * The request carries a shared secret, set as the script property SECRET and
 * as WAITLIST_ALERT_SECRET in Vercel. Every answer is JSON: { ok: true },
 * { ok: true, duplicate: true }, or { ok: false, error } with one of
 * "unauthorized", "bad_request", "no_sheet" or "email_failed".
 *
 * This is the versioned copy. Change it here, then paste it into the sheet
 * again and deploy a new version.
 */

const SHEET_NAME = "Alpha Waitlist";
// Columns: Joined · Email · Signup ID · Status · Notes. The script writes the
// first three; Status and Notes are the owner's.
const SIGNUP_ID_COLUMN = 3;

function doPost(e) {
  let request;
  try {
    request = JSON.parse(e.postData.contents);
  } catch (error) {
    return reply({ ok: false, error: "bad_request" });
  }

  const secret =
    PropertiesService.getScriptProperties().getProperty("SECRET") || "";
  if (!secret || !sameSecret(String(request.secret || ""), secret)) {
    return reply({ ok: false, error: "unauthorized" });
  }

  if (request.event === "waitlist.joined") return addSignup(request);
  if (request.event === "member.let_in") return sendLetIn(request);
  if (request.event === "member.code") return sendCode(request);
  return reply({ ok: false, error: "bad_request" });
}

/** A new waitlist entry: a row on the sheet, and an email to the owner. */
function addSignup(request) {
  const joinedAt = new Date(request.joinedAt);
  if (
    typeof request.signupId !== "string" ||
    typeof request.email !== "string" ||
    isNaN(joinedAt.getTime())
  ) {
    return reply({ ok: false, error: "bad_request" });
  }

  // Two signups at once would otherwise both see the same last row.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) return reply({ ok: false, error: "no_sheet" });

    // The app retries a request that timed out, which may have landed. A
    // signup ID already on the sheet means this one did.
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const seen = sheet
        .getRange(2, SIGNUP_ID_COLUMN, lastRow - 1, 1)
        .createTextFinder(request.signupId)
        .matchEntireCell(true)
        .findNext();
      if (seen) return reply({ ok: true, duplicate: true });
    }

    const row = lastRow + 1;
    sheet
      .getRange(row, 1, 1, 3)
      .setValues([[joinedAt, asText(request.email), asText(request.signupId)]]);
    sheet.getRange(row, 1).setNumberFormat("yyyy-mm-dd h:mm am/pm");
    SpreadsheetApp.flush();

    try {
      MailApp.sendEmail({
        to: recipients(),
        subject: "New waitlist signup: " + request.email,
        body: [
          request.email + " joined the Housemate waitlist.",
          "",
          "Joined: " +
            Utilities.formatDate(
              joinedAt,
              spreadsheet.getSpreadsheetTimeZone(),
              "EEE d MMM yyyy, h:mm a",
            ),
          "On the list: " + (row - 1),
          "",
          spreadsheet.getUrl(),
        ].join("\n"),
      });
    } catch (error) {
      // The row is saved; only the email failed (most often the daily quota).
      return reply({ ok: false, error: "email_failed" });
    }

    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/**
 * E1: someone is off the waitlist, with their Get started link. From "John at
 * Housemate", so a reply reaches John.
 *
 * Entries from the old email bar, and emails added straight to the alpha
 * list, have no name and no details yet, so they get the variant that says
 * setting up takes two minutes. Get started always asks for a first name, so
 * a name means the details are there.
 */
function sendLetIn(request) {
  const expiresAt = new Date(request.expiresAt);
  if (
    !isEmail(request.to) ||
    typeof request.firstName !== "string" ||
    !/^https?:\/\/\S+$/.test(String(request.link || "")) ||
    isNaN(expiresAt.getTime())
  ) {
    return reply({ ok: false, error: "bad_request" });
  }

  const firstName = request.firstName.trim();
  const heading = firstName
    ? "A spot opened up, " + firstName + "."
    : "A spot opened up.";
  const lead = firstName
    ? "You’re off the waitlist and into the Housemate pilot. We already have your details, so you’ll just confirm it’s you with a code."
    : "You’re off the waitlist and into the Housemate pilot. Set up your account in about two minutes.";
  const expires =
    "The link works once and expires on " +
    // A no-break space keeps "16 October" on one line on a phone.
    Utilities.formatDate(
      expiresAt,
      Session.getScriptTimeZone(),
      "d MMMM",
    ).replace(" ", "\u00a0") +
    ".";
  const resend = "If it runs out, reply to this email and I’ll send a new one.";
  // Two lines, broken where the board breaks them.
  const footer = [
    "You’re getting this because you joined the Housemate waitlist",
    "at myhousemate.co. Housemate, operated by John Healy.",
  ];

  return sendMemberEmail({
    to: request.to,
    name: "John at Housemate",
    subject: "A spot opened up at Housemate",
    body: [
      heading,
      "",
      lead,
      "",
      "Get started: " + request.link,
      "",
      expires,
      resend,
      "",
      "—",
      footer.join(" "),
    ].join("\n"),
    htmlBody: emailHtml({
      heading: heading,
      lead: lead,
      middle: buttonHtml("Get started", request.link),
      notes: [expires, resend],
      footer: footer,
    }),
  });
}

/** E2: a six-digit sign-in code, for Supabase's Send Email hook (D-073). */
function sendCode(request) {
  const code = String(request.code || "");
  if (!isEmail(request.to) || !/^\d{6}$/.test(code)) {
    return reply({ ok: false, error: "bad_request" });
  }

  const heading = "Your Housemate code";
  const lead =
    "Enter it on the Housemate page you came from to confirm it’s you.";
  const notes = [
    "It works once and expires in an hour.",
    "If you didn’t ask for a code, you can ignore this email.",
  ];
  const footer = [
    "You’re getting this because a code was asked for with this email",
    "at myhousemate.co. Housemate, operated by John Healy.",
  ];

  return sendMemberEmail({
    to: request.to,
    name: "Housemate",
    subject: heading,
    body: [
      heading,
      "",
      lead,
      "",
      code,
      "",
      notes.join("\n"),
      "",
      "—",
      footer.join(" "),
    ].join("\n"),
    htmlBody: emailHtml({
      heading: heading,
      lead: lead,
      middle: codeHtml(code),
      notes: notes,
      footer: footer,
    }),
  });
}

/**
 * Sends one member email. A failure says only "email_failed": the error
 * isn't logged, since the message it failed to send holds a link or a code.
 */
function sendMemberEmail(message) {
  try {
    MailApp.sendEmail(message);
  } catch (error) {
    return reply({ ok: false, error: "email_failed" });
  }
  return reply({ ok: true });
}

// The E1 and E2 boards (docs/design.md, Emails), as tables with inline
// styles so they hold in Gmail and Outlook. The serif falls back to Georgia
// and Lato to Helvetica, since most mail apps don't load web fonts.
const SERIF = "'DM Serif Text', Georgia, 'Times New Roman', serif";
const SANS = "Lato, Helvetica, Arial, sans-serif";
// Served by the web app (apps/web/public/brand), at three times its size.
const LOGO_URL = "https://myhousemate.co/brand/housemate-lockup-evergreen.png";

function emailHtml(parts) {
  const notes = parts.notes.map(escapeHtml).join("<br>");
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="color-scheme" content="light">' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Text&amp;family=Lato:wght@400;700&amp;display=swap" rel="stylesheet">' +
    "<title>" +
    escapeHtml(parts.heading) +
    "</title></head>" +
    '<body style="margin:0;padding:0;background-color:#F5F3F1;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F3F1;">' +
    '<tr><td align="center" style="padding:40px 16px 56px;">' +
    // The card.
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFBF9;border:1px solid #ECE8E5;border-radius:12px;">' +
    '<tr><td align="center" style="padding:40px 48px 0;">' +
    '<img src="' +
    LOGO_URL +
    '" width="163" height="20" alt="Housemate" style="display:block;border:0;width:163px;height:20px;color:#14342F;font-family:' +
    SERIF +
    ';font-size:20px;line-height:20px;">' +
    "</td></tr>" +
    // 32px gap, plus the heading group's 8px.
    '<tr><td align="center" style="padding:40px 48px 0;font-family:' +
    SERIF +
    ';font-size:36px;line-height:44px;letter-spacing:-0.01em;color:#14342F;font-weight:400;text-wrap:balance;">' +
    escapeHtml(parts.heading) +
    "</td></tr>" +
    '<tr><td align="center" style="padding:16px 48px 0;font-family:' +
    SANS +
    ';font-size:16px;line-height:24px;color:#49504E;text-wrap:pretty;">' +
    escapeHtml(parts.lead) +
    "</td></tr>" +
    '<tr><td align="center" style="padding:32px 48px 0;">' +
    parts.middle +
    "</td></tr>" +
    '<tr><td align="center" style="padding:32px 48px 44px;font-family:' +
    SANS +
    ';font-size:14px;line-height:20px;color:#68706E;text-wrap:balance;">' +
    notes +
    "</td></tr>" +
    "</table>" +
    // The footer, 24px under the card.
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">' +
    '<tr><td align="center" style="padding:24px 4px 0;font-family:' +
    SANS +
    ';font-size:12px;line-height:17px;color:#68706E;">' +
    parts.footer.map(escapeHtml).join("<br>") +
    "</td></tr></table>" +
    "</td></tr></table></body></html>"
  );
}

/** The large primary button: 44px tall, at least 176px wide. */
function buttonHtml(label, href) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td align="center" bgcolor="#14342F" style="border-radius:8px;background-color:#14342F;">' +
    '<a href="' +
    escapeHtml(href) +
    '" style="display:inline-block;min-width:112px;padding:12px 32px;font-family:' +
    SANS +
    ';font-size:15px;line-height:20px;letter-spacing:-0.01em;color:#FFFBF9;text-decoration:none;border-radius:8px;">' +
    escapeHtml(label) +
    "</a></td></tr></table>"
  );
}

/** The code, in its box. */
function codeHtml(code) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td align="center" style="padding:16px 32px;background-color:#F5F3F1;border:1px solid #ECE8E5;border-radius:12px;font-family:' +
    SANS +
    ';font-size:36px;line-height:44px;font-weight:700;letter-spacing:0.18em;font-variant-numeric:tabular-nums;color:#2A312F;">' +
    code +
    "</td></tr></table>"
  );
}

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Run once from the editor before deploying (choose "setup", then Run). It
 * names the tab and freezes the header row, and running it is also what asks
 * for the sheet and email permissions. Safe to run again.
 */
function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(SHEET_NAME) ||
    spreadsheet.getSheets()[0].setName(SHEET_NAME);
  sheet
    .getRange(1, 1, 1, 5)
    .setValues([["Joined", "Email", "Signup ID", "Status", "Notes"]])
    .setFontWeight("bold");
  sheet.setFrozenRows(1);
  // Touches MailApp so the permission prompt covers sending email too.
  MailApp.getRemainingDailyQuota();
}

/** Opening the URL in a browser shows that the deployment is live. */
function doGet() {
  return ContentService.createTextOutput(
    "Housemate waitlist alerts are running.",
  );
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Whoever deployed the script, unless the script property NOTIFY_TO lists
 * other addresses (comma-separated).
 */
function recipients() {
  const listed =
    PropertiesService.getScriptProperties().getProperty("NOTIFY_TO");
  return listed || Session.getEffectiveUser().getEmail();
}

/**
 * Keeps a value as text. An "address" can start with =, +, - or @, and the
 * sheet would run it as a formula; a leading apostrophe stops that and
 * doesn't show.
 */
function asText(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

/** Compares every character, so the time taken doesn't hint at the secret. */
function sameSecret(given, expected) {
  if (given.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}
