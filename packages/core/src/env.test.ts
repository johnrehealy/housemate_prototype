import { describe, expect, it } from "vitest";
import { loadServerEnv } from "./env";

const localEnv = {
  APP_ENV: "local",
  PUBLIC_BASE_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  SMS_PROVIDER: "simulator",
};

describe("loadServerEnv", () => {
  it("parses a local environment with defaults", () => {
    const env = loadServerEnv(localEnv);
    expect(env.APP_ENV).toBe("local");
    expect(env.ACK_REPLY_ENABLED).toBe(false);
    expect(env.TEAM_ALERT_PHONES).toEqual([]);
  });

  it("parses a comma-separated list of team phones", () => {
    const env = loadServerEnv({
      ...localEnv,
      TEAM_ALERT_PHONES: "+15551234567, +15557654321",
    });
    expect(env.TEAM_ALERT_PHONES).toEqual(["+15551234567", "+15557654321"]);
  });

  it("rejects a team phone that isn't E.164", () => {
    expect(() =>
      loadServerEnv({ ...localEnv, TEAM_ALERT_PHONES: "555-123-4567" }),
    ).toThrow(/E\.164/);
  });

  it("rejects the acknowledgment reply in production", () => {
    expect(() =>
      loadServerEnv({
        ...localEnv,
        APP_ENV: "production",
        SMS_PROVIDER: "twilio",
        ACK_REPLY_ENABLED: "true",
      }),
    ).toThrow(/ACK_REPLY_ENABLED/);
  });

  it("requires Twilio credentials when Twilio is the provider", () => {
    expect(() =>
      loadServerEnv({ ...localEnv, SMS_PROVIDER: "twilio" }),
    ).toThrow(/TWILIO_AUTH_TOKEN/);
  });

  it("treats blank Twilio values as missing", () => {
    expect(() =>
      loadServerEnv({
        ...localEnv,
        SMS_PROVIDER: "twilio",
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "  ",
        TWILIO_MESSAGING_SERVICE_SID: "MG123",
      }),
    ).toThrow(/TWILIO_AUTH_TOKEN/);
  });

  it("accepts Twilio when its credentials are set", () => {
    const env = loadServerEnv({
      ...localEnv,
      SMS_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "secret",
      TWILIO_MESSAGING_SERVICE_SID: "MG123",
    });
    expect(env.SMS_PROVIDER).toBe("twilio");
  });

  it("requires Supabase credentials outside local development", () => {
    expect(() =>
      loadServerEnv({
        ...localEnv,
        APP_ENV: "staging",
        SMS_PROVIDER: "twilio",
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "secret",
        TWILIO_MESSAGING_SERVICE_SID: "MG123",
      }),
    ).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("accepts staging when Supabase credentials are set", () => {
    const env = loadServerEnv({
      ...localEnv,
      APP_ENV: "staging",
      SMS_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "secret",
      TWILIO_MESSAGING_SERVICE_SID: "MG123",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_example",
    });
    expect(env.SUPABASE_URL).toBe("https://project.supabase.co");
  });

  it("rejects the SMS simulator in production", () => {
    expect(() => loadServerEnv({ ...localEnv, APP_ENV: "production" })).toThrow(
      /SMS_PROVIDER/,
    );
  });

  describe("waitlist alerts", () => {
    const url = "https://script.example.com/macros/s/fake/exec";
    const secret = "0123456789abcdef0123456789abcdef";

    it("leaves the alert off when neither key is set", () => {
      const env = loadServerEnv(localEnv);
      expect(env.WAITLIST_ALERT_URL).toBeUndefined();
      expect(env.WAITLIST_ALERT_SECRET).toBeUndefined();
    });

    it("accepts the two keys together", () => {
      const env = loadServerEnv({
        ...localEnv,
        WAITLIST_ALERT_URL: url,
        WAITLIST_ALERT_SECRET: secret,
      });
      expect(env.WAITLIST_ALERT_URL).toBe(url);
    });

    it("refuses one key without the other", () => {
      expect(() =>
        loadServerEnv({ ...localEnv, WAITLIST_ALERT_URL: url }),
      ).toThrow(/WAITLIST_ALERT_SECRET/);
      expect(() =>
        loadServerEnv({ ...localEnv, WAITLIST_ALERT_SECRET: secret }),
      ).toThrow(/WAITLIST_ALERT_URL/);
    });

    it("refuses a short secret", () => {
      expect(() =>
        loadServerEnv({
          ...localEnv,
          WAITLIST_ALERT_URL: url,
          WAITLIST_ALERT_SECRET: "short",
        }),
      ).toThrow(/at least 32/);
    });

    it("allows plain http only in local development", () => {
      const stub = "http://127.0.0.1:3999/alert";
      expect(
        loadServerEnv({
          ...localEnv,
          WAITLIST_ALERT_URL: stub,
          WAITLIST_ALERT_SECRET: secret,
        }).WAITLIST_ALERT_URL,
      ).toBe(stub);
      expect(() =>
        loadServerEnv({
          ...localEnv,
          APP_ENV: "staging",
          SMS_PROVIDER: "twilio",
          TWILIO_ACCOUNT_SID: "AC123",
          TWILIO_AUTH_TOKEN: "secret",
          TWILIO_MESSAGING_SERVICE_SID: "MG123",
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SECRET_KEY: "sb_secret_example",
          WAITLIST_ALERT_URL: stub,
          WAITLIST_ALERT_SECRET: secret,
        }),
      ).toThrow(/https/);
    });
  });
});
