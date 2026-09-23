import { describe, expect, it } from "vitest";
import { loadServerEnv } from "./env";

const localEnv = {
  APP_ENV: "local",
  PUBLIC_BASE_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  SMS_PROVIDER: "simulator",
  TWILIO_AUTH_TOKEN: "local-test-token",
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
    ).toThrow(/TWILIO_ACCOUNT_SID/);
  });

  it("requires the webhook token even with the simulator", () => {
    expect(() =>
      loadServerEnv({ ...localEnv, TWILIO_AUTH_TOKEN: undefined }),
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

  it("takes a Vercel preview's own address when PUBLIC_BASE_URL is unset", () => {
    const preview = {
      ...localEnv,
      PUBLIC_BASE_URL: "",
      VERCEL_ENV: "preview",
      VERCEL_URL: "housemate-abc123-housemate.vercel.app",
    };
    expect(loadServerEnv(preview).PUBLIC_BASE_URL).toBe(
      "https://housemate-abc123-housemate.vercel.app",
    );
    expect(
      loadServerEnv({ ...preview, PUBLIC_BASE_URL: "https://example.com" })
        .PUBLIC_BASE_URL,
    ).toBe("https://example.com");
    // Production has a real address, and must say so.
    expect(() =>
      loadServerEnv({ ...preview, VERCEL_ENV: "production" }),
    ).toThrow(/PUBLIC_BASE_URL/);
  });

  it("rejects the SMS simulator in production", () => {
    expect(() => loadServerEnv({ ...localEnv, APP_ENV: "production" })).toThrow(
      /SMS_PROVIDER/,
    );
  });
});
