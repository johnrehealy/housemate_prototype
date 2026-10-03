import type { AddressLookup, AddressParts, AddressSuggestion } from "./types";

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places/";
const STATIC_MAP_URL = "https://maps.googleapis.com/maps/api/staticmap";

/** The map on the home step: 600 x 184 at twice the density (board G2). */
const MAP_SIZE = "600x184";
/** Evergreen, the pin on board G2. */
const PIN_COLOR = "0x14342F";

type TextWithMatches = {
  text?: string;
  matches?: { startOffset?: number; endOffset?: number }[];
};

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: TextWithMatches;
        secondaryText?: { text?: string };
      };
    };
  }[];
};

type DetailsResponse = {
  id?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  location?: { latitude?: number; longitude?: number };
};

/** A failed call to Google, named by the call and the HTTP status only. */
export class AddressLookupError extends Error {
  constructor(call: string, status: number) {
    super(`Address lookup ${call} failed with HTTP ${status}`);
    this.name = "AddressLookupError";
  }
}

/**
 * Address search through Google Places API (New) and the Maps Static API.
 * It runs on our server only, so the key never reaches a page, and the map
 * comes back as a data URL, so the coordinates never appear in a URL of ours
 * either.
 */
export function createGoogleAddressLookup(config: {
  apiKey: string;
  fetch?: typeof fetch;
}): AddressLookup {
  const request = config.fetch ?? fetch;

  async function staticMap(latitude: number, longitude: number) {
    const spot = `${latitude},${longitude}`;
    const url = new URL(STATIC_MAP_URL);
    url.search = new URLSearchParams({
      center: spot,
      zoom: "16",
      size: MAP_SIZE,
      scale: "2",
      markers: `color:${PIN_COLOR}|${spot}`,
      key: config.apiKey,
    }).toString();
    const response = await request(url);
    // A home still saves without its picture.
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "image/png";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  }

  return {
    async suggest({ query, sessionToken }) {
      const response = await request(AUTOCOMPLETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input: query,
          sessionToken,
          includedRegionCodes: ["us"],
          includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        }),
      });
      if (!response.ok) {
        throw new AddressLookupError("suggest", response.status);
      }
      const body = (await response.json()) as AutocompleteResponse;

      const suggestions: AddressSuggestion[] = [];
      for (const { placePrediction } of body.suggestions ?? []) {
        const main = placePrediction?.structuredFormat?.mainText;
        if (!placePrediction?.placeId || !main?.text) continue;
        suggestions.push({
          placeId: placePrediction.placeId,
          primary: main.text,
          primaryMatches: (main.matches ?? []).map((match) => ({
            // Google leaves out an offset of zero.
            start: match.startOffset ?? 0,
            end: match.endOffset ?? 0,
          })),
          secondary:
            placePrediction.structuredFormat?.secondaryText?.text ?? "",
        });
      }
      return suggestions.slice(0, 5);
    },

    async resolve({ placeId, sessionToken }) {
      const url = new URL(DETAILS_URL + encodeURIComponent(placeId));
      url.searchParams.set("sessionToken", sessionToken);
      const response = await request(url, {
        headers: {
          "X-Goog-Api-Key": config.apiKey,
          "X-Goog-FieldMask": "id,addressComponents,location",
        },
      });
      if (!response.ok) {
        throw new AddressLookupError("resolve", response.status);
      }
      const body = (await response.json()) as DetailsResponse;

      const parts = addressParts(body.addressComponents ?? []);
      if (!parts) return null;

      const { latitude, longitude } = body.location ?? {};
      const map =
        latitude === undefined || longitude === undefined
          ? null
          : await staticMap(latitude, longitude);

      return { ...parts, placeId: body.id ?? placeId, map };
    },
  };
}

/** The street line, city, state and ZIP, or null if any is missing. */
function addressParts(
  components: NonNullable<DetailsResponse["addressComponents"]>,
): AddressParts | null {
  const find = (type: string) =>
    components.find((component) => component.types?.includes(type));

  const number = find("street_number")?.longText;
  const route = find("route")?.longText;
  const city = (
    find("locality") ??
    find("postal_town") ??
    find("sublocality") ??
    find("neighborhood")
  )?.longText;
  const state = find("administrative_area_level_1")?.shortText;
  const zip = find("postal_code")?.longText;

  if (!number || !route || !city || !state || !zip) return null;
  return { line1: `${number} ${route}`, city, state, zip };
}
