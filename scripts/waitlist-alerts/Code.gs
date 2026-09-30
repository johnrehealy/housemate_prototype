/**
 * Housemate waitlist alerts.
 *
 * Paste this into the "Housemate Alpha Waitlist" sheet's Apps Script (Extensions →
 * Apps Script) and deploy it as a web app; README.md beside it has the steps.
 * The web app posts each new signup here (packages/core/src/alerts), and this
 * adds a row to the "Alpha Waitlist" tab and emails the sheet's owner.
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

  const joinedAt = new Date(request.joinedAt);
  if (
    request.event !== "waitlist.joined" ||
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
