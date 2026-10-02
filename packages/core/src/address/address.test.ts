import { describe, expect, it, vi } from "vitest";
import { createFakeAddressLookup } from "./fake";
import { formatAddress } from "./format";
import { AddressLookupError, createGoogleAddressLookup } from "./google";
import { homeTimezone } from "./timezone";

const KEY = "test-key-not-real";
const SESSION = "session-1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A made-up place, in Google's shape. */
const DETAILS = {
  id: "place-abc",
  addressComponents: [
    { longText: "1450", shortText: "1450", types: ["street_number"] },
    { longText: "Sample Street", shortText: "Sample St", types: ["route"] },
    { longText: "Testville", shortText: "Testville", types: ["locality"] },
    {
      longText: "Illinois",
      shortText: "IL",
      types: ["administrative_area_level_1"],
    },
    { longText: "00001", shortText: "00001", types: ["postal_code"] },
  ],
  location: { latitude: 1.5, longitude: -2.5 },
};

describe("homeTimezone", () => {
  it("uses the state's zone", () => {
    expect(homeTimezone("IL")).toBe("America/Chicago");
    expect(homeTimezone(" ca ")).toBe("America/Los_Angeles");
  });

  it("lets the browser settle a state with two clocks", () => {
    expect(homeTimezone("IN", "America/Chicago")).toBe("America/Chicago");
    expect(homeTimezone("IN", "America/Indiana/Indianapolis")).toBe(
      "America/Indiana/Indianapolis",
    );
    // A browser elsewhere doesn't move a home.
    expect(homeTimezone("IL", "Europe/London")).toBe("America/Chicago");
    expect(homeTimezone("AZ", null)).toBe("America/Phoenix");
  });

  it("knows nothing outside the US", () => {
    expect(homeTimezone("ZZ")).toBeNull();
    expect(homeTimezone("")).toBeNull();
  });
});

describe("formatAddress", () => {
  it("joins the parts on one line, with the unit after the street", () => {
    const parts = { line1: "1 Test Road", city: "Testville", state: "OH" };
    expect(formatAddress({ ...parts, zip: "00001" })).toBe(
      "1 Test Road, Testville, OH 00001",
    );
    expect(formatAddress({ ...parts, zip: "00001", unit: "Apt 2" })).toBe(
      "1 Test Road, Apt 2, Testville, OH 00001",
    );
  });
});

describe("createGoogleAddressLookup", () => {
  it("asks for US addresses, with the session token and a field mask", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      json({
        suggestions: [
          {
            placePrediction: {
              placeId: "place-abc",
              structuredFormat: {
                mainText: {
                  text: "1450 Sample Street",
                  matches: [{ endOffset: 8 }],
                },
                secondaryText: { text: "Testville, IL, USA" },
              },
            },
          },
          // Anything without a place ID or a street line is skipped.
          { placePrediction: { structuredFormat: {} } },
        ],
      }),
    );
    const lookup = createGoogleAddressLookup({ apiKey: KEY, fetch });

    const suggestions = await lookup.suggest({
      query: "1450 Sam",
      sessionToken: SESSION,
    });

    expect(suggestions).toEqual([
      {
        placeId: "place-abc",
        primary: "1450 Sample Street",
        primaryMatches: [{ start: 0, end: 8 }],
        secondary: "Testville, IL, USA",
      },
    ]);

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://places.googleapis.com/v1/places:autocomplete",
    );
    // What was typed travels in the body, never in the URL.
    expect(String(url)).not.toContain("Sam");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Goog-Api-Key")).toBe(KEY);
    expect(headers.get("X-Goog-FieldMask")).toBe(
      "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      input: "1450 Sam",
      sessionToken: SESSION,
      includedRegionCodes: ["us"],
      includedPrimaryTypes: ["street_address", "premise", "subpremise"],
    });
  });

  it("resolves a pick into address parts and a map, without the key", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(DETAILS))
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
        }),
      );
    const lookup = createGoogleAddressLookup({ apiKey: KEY, fetch });

    const resolved = await lookup.resolve({
      placeId: "place-abc",
      sessionToken: SESSION,
    });

    expect(resolved).toEqual({
      placeId: "place-abc",
      line1: "1450 Sample Street",
      city: "Testville",
      state: "IL",
      zip: "00001",
      map: "data:image/png;base64,AQID",
    });
    // The key goes to Google and nowhere else.
    expect(JSON.stringify(resolved)).not.toContain(KEY);

    const details = new URL(String(fetch.mock.calls[0]![0]));
    expect(details.origin + details.pathname).toBe(
      "https://places.googleapis.com/v1/places/place-abc",
    );
    expect(details.searchParams.get("sessionToken")).toBe(SESSION);
    expect(details.searchParams.has("key")).toBe(false);
    const headers = new Headers(fetch.mock.calls[0]![1]?.headers);
    expect(headers.get("X-Goog-FieldMask")).toBe(
      "id,addressComponents,location",
    );

    const map = new URL(String(fetch.mock.calls[1]![0]));
    expect(map.origin + map.pathname).toBe(
      "https://maps.googleapis.com/maps/api/staticmap",
    );
    expect(map.searchParams.get("markers")).toBe("color:0x14342F|1.5,-2.5");
  });

  it("returns no address when a part is missing, and saves one without its map", async () => {
    const withoutNumber = {
      ...DETAILS,
      addressComponents: DETAILS.addressComponents.slice(1),
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(withoutNumber))
      .mockResolvedValueOnce(json(DETAILS))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const lookup = createGoogleAddressLookup({ apiKey: KEY, fetch });

    expect(
      await lookup.resolve({ placeId: "place-abc", sessionToken: SESSION }),
    ).toBeNull();
    expect(
      await lookup.resolve({ placeId: "place-abc", sessionToken: SESSION }),
    ).toMatchObject({ line1: "1450 Sample Street", map: null });
  });

  it("fails with the call and status only", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json({ error: { message: "bad" } }, 403));
    const lookup = createGoogleAddressLookup({ apiKey: KEY, fetch });

    const failure = lookup.suggest({
      query: "1450 Sam",
      sessionToken: SESSION,
    });
    await expect(failure).rejects.toBeInstanceOf(AddressLookupError);
    await expect(failure).rejects.toThrow(
      "Address lookup suggest failed with HTTP 403",
    );
  });
});

describe("createFakeAddressLookup", () => {
  const lookup = createFakeAddressLookup();

  it("suggests generated addresses by their start", async () => {
    const suggestions = await lookup.suggest({
      query: "1450 Sample S",
      sessionToken: SESSION,
    });
    expect(suggestions.map((suggestion) => suggestion.primary)).toEqual([
      "1450 Sample Street",
    ]);
    expect(suggestions[0]?.primaryMatches).toEqual([{ start: 0, end: 13 }]);
    expect(
      await lookup.suggest({ query: "Nowhere Lane", sessionToken: SESSION }),
    ).toEqual([]);
  });

  it("resolves a suggestion with a drawn map", async () => {
    const resolved = await lookup.resolve({
      placeId: "fake-place-3",
      sessionToken: SESSION,
    });
    expect(resolved).toMatchObject({
      placeId: "fake-place-3",
      line1: "1450 Sampleview Drive",
      city: "Exampleton",
      state: "OH",
      zip: "00003",
    });
    expect(resolved?.map).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(
      await lookup.resolve({ placeId: "nope", sessionToken: SESSION }),
    ).toBeNull();
  });
});
