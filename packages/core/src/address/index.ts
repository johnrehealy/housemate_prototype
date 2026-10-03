import type { ServerEnv } from "../env";
import { createFakeAddressLookup } from "./fake";
import { createGoogleAddressLookup } from "./google";
import type { AddressLookup } from "./types";

export type {
  AddressLookup,
  AddressParts,
  AddressSuggestion,
  ResolvedAddress,
} from "./types";
export { AddressLookupError, createGoogleAddressLookup } from "./google";
export { createFakeAddressLookup } from "./fake";
export { formatAddress } from "./format";
export { homeTimezone, US_STATES } from "./timezone";

/**
 * The address search this environment uses, or null when it's off and the
 * home step asks for the address typed in (D-068).
 */
export function createAddressLookup(
  env: Pick<ServerEnv, "ADDRESS_LOOKUP" | "GOOGLE_MAPS_API_KEY">,
): AddressLookup | null {
  switch (env.ADDRESS_LOOKUP) {
    case "google":
      if (!env.GOOGLE_MAPS_API_KEY) {
        throw new Error("Set GOOGLE_MAPS_API_KEY to use ADDRESS_LOOKUP=google");
      }
      return createGoogleAddressLookup({ apiKey: env.GOOGLE_MAPS_API_KEY });
    case "fake":
      return createFakeAddressLookup();
    case "off":
      return null;
  }
}
