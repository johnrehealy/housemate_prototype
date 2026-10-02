/**
 * Address search for Get started's home step (D-068), behind our own
 * interface so the provider can change (invariant 5). Google Places (New) is
 * the real one; a fake with generated addresses serves local runs and tests.
 *
 * What someone types is part of their home address, so it's only ever passed
 * through: never logged, never put in a URL of ours, never stored. Only the
 * picked address is kept, as the home's record, with its place ID.
 */

/** A US address, split the way the typed form and the home record need it. */
export type AddressParts = {
  line1: string;
  city: string;
  /** Two-letter state or territory code, e.g. "IL". */
  state: string;
  /** Five digits. */
  zip: string;
};

/** One suggestion for what's been typed so far. */
export type AddressSuggestion = {
  placeId: string;
  /** The street line, e.g. "1450 Sample Street". */
  primary: string;
  /** Where in `primary` the typed text matched, for setting it bold. */
  primaryMatches: { start: number; end: number }[];
  /** The rest, e.g. "Springfield, IL 62704". */
  secondary: string;
};

export type ResolvedAddress = AddressParts & {
  placeId: string;
  /** A small map of the spot as a data URL, or null when there isn't one. */
  map: string | null;
};

export interface AddressLookup {
  /**
   * Up to five suggestions. `sessionToken` ties a run of keystrokes and the
   * final pick together, which is how Google bills a search.
   */
  suggest(input: {
    query: string;
    sessionToken: string;
  }): Promise<AddressSuggestion[]>;
  /** The picked suggestion in full, or null when it isn't a usable address. */
  resolve(input: {
    placeId: string;
    sessionToken: string;
  }): Promise<ResolvedAddress | null>;
}
