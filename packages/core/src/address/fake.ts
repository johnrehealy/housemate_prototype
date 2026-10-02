import type { AddressLookup, ResolvedAddress } from "./types";

/*
 * Generated addresses for local runs and tests, so neither ever calls Google
 * or holds a real address (invariant 6). The towns and ZIP codes don't exist.
 * The states are real because a home's time zone comes from its state.
 */
const ADDRESSES: Omit<ResolvedAddress, "map">[] = [
  {
    placeId: "fake-place-1",
    line1: "1450 Sample Street",
    city: "Testville",
    state: "IL",
    zip: "00001",
  },
  {
    placeId: "fake-place-2",
    line1: "1450 Sample Court",
    city: "Testville",
    state: "IL",
    zip: "00002",
  },
  {
    placeId: "fake-place-3",
    line1: "1450 Sampleview Drive",
    city: "Exampleton",
    state: "OH",
    zip: "00003",
  },
  {
    placeId: "fake-place-4",
    line1: "1450 Sampson Road",
    city: "Placeholder",
    state: "OR",
    zip: "00004",
  },
];

/** A drawn map with a pin, standing in for Google's picture. */
const FAKE_MAP = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="184" viewBox="0 0 600 184"><rect width="600" height="184" fill="#F5F3F1"/><path d="M0 44 L600 58 M96 184 L142 0 M512 184 L486 0 M0 150 L600 138" stroke="#FFFFFF" stroke-width="6" fill="none"/><path d="M0 116 C 140 108, 220 92, 320 98 S 500 124, 600 104" stroke="#DDD7D3" stroke-width="14" fill="none"/><path d="M0 116 C 140 108, 220 92, 320 98 S 500 124, 600 104" stroke="#FFFFFF" stroke-width="10" fill="none"/><path d="M300 50C291.2 50 284 57.2 284 66c0 12.4 16 28 16 28s16-15.6 16-28C316 57.2 308.8 50 300 50z" fill="#14342F"/><circle cx="300" cy="66" r="6" fill="#FFFBF9"/></svg>`,
).toString("base64")}`;

/**
 * Suggests the generated addresses whose street line starts with what's been
 * typed. Anything containing "nowhere" finds nothing, for the no-match state.
 */
export function createFakeAddressLookup(): AddressLookup {
  return {
    async suggest({ query }) {
      const typed = query.trim().toLowerCase();
      if (!typed || typed.includes("nowhere")) return [];
      return ADDRESSES.filter((address) =>
        address.line1.toLowerCase().startsWith(typed),
      ).map((address) => ({
        placeId: address.placeId,
        primary: address.line1,
        primaryMatches: [{ start: 0, end: typed.length }],
        secondary: `${address.city}, ${address.state} ${address.zip}`,
      }));
    },

    async resolve({ placeId }) {
      const found = ADDRESSES.find((address) => address.placeId === placeId);
      if (!found) return null;
      return { ...found, map: FAKE_MAP };
    },
  };
}
