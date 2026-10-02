import { randomBytes } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";
import { handleSendEmailHook } from "./send-email-hook";
import type { CodeEmail, Mailer, MailResult } from "./types";

const key = randomBytes(32).toString("base64");
const secret = `v1,whsec_${key}`;

/** A mailer that records what it was asked to send. */
function recordingMailer(result: MailResult = { ok: true }) {
  const sent: CodeEmail[] = [];
  const mailer: Mailer = {
    name: "off",
    sendLetIn: () => Promise.reject(new Error("not used")),
    sendCode: (email) => {
      sent.push(email);
      return Promise.resolve(result);
    },
  };
  return { mailer, sent };
}

/** A request signed the way Supabase signs it. */
function signed(payload: unknown, signWith = key) {
  const body = JSON.stringify(payload);
  const id = "msg_test";
  const at = new Date();
  return {
    body,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
      "webhook-signature": new Webhook(signWith).sign(id, at, body),
    },
  };
}

function codeEmail(type = "magiclink", token = "482913") {
  return {
    user: { id: "user-1", email: "sam@example.com" },
    email_data: {
      token,
      token_hash: "hash",
      redirect_to: "",
      email_action_type: type,
      site_url: "http://127.0.0.1:3000",
    },
  };
}

describe("handleSendEmailHook", () => {
  it("emails the code from a signed request", async () => {
    const { mailer, sent } = recordingMailer();
    for (const type of ["magiclink", "email"]) {
      const response = await handleSendEmailHook(
        { secret, mailer },
        signed(codeEmail(type)),
      );
      expect(response).toEqual({ status: 200, outcome: "sent", body: {} });
    }
    expect(sent).toEqual([
      { to: "sam@example.com", code: "482913" },
      { to: "sam@example.com", code: "482913" },
    ]);
  });

  it("refuses an unsigned or wrongly signed request, and sends nothing", async () => {
    const { mailer, sent } = recordingMailer();
    const wrongKey = randomBytes(32).toString("base64");
    const forged = signed(codeEmail(), wrongKey);
    const unsigned = { body: forged.body, headers: {} };

    for (const request of [forged, unsigned]) {
      const response = await handleSendEmailHook({ secret, mailer }, request);
      expect(response).toMatchObject({
        status: 401,
        outcome: "bad_signature",
      });
    }
    expect(sent).toEqual([]);
  });

  it("refuses to run without a secret", async () => {
    const { mailer, sent } = recordingMailer();
    for (const missing of [undefined, "", key]) {
      const response = await handleSendEmailHook(
        { secret: missing, mailer },
        signed(codeEmail()),
      );
      expect(response).toMatchObject({
        status: 500,
        outcome: "not_configured",
      });
    }
    expect(sent).toEqual([]);
  });

  it("sends nothing but sign-in codes", async () => {
    const { mailer, sent } = recordingMailer();
    const recovery = await handleSendEmailHook(
      { secret, mailer },
      signed(codeEmail("recovery")),
    );
    const noCode = await handleSendEmailHook(
      { secret, mailer },
      signed(codeEmail("magiclink", "not-a-code")),
    );
    expect(recovery).toMatchObject({ status: 400, outcome: "not_a_code" });
    expect(noCode).toMatchObject({ status: 400, outcome: "bad_request" });
    expect(sent).toEqual([]);
  });

  it("says the email failed without repeating the code or the address", async () => {
    const { mailer } = recordingMailer({ ok: false, reason: "timeout" });
    const response = await handleSendEmailHook(
      { secret, mailer },
      signed(codeEmail()),
    );
    expect(response).toMatchObject({
      status: 500,
      outcome: "mail_failed:timeout",
    });
    const said = JSON.stringify(response);
    expect(said).not.toContain("482913");
    expect(said).not.toContain("sam@example.com");
  });
});
