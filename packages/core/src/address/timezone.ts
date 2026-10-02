/**
 * US states and territories, with the time zones a home in each can be in.
 * The first zone is where most people live; the rest are parts of the state
 * that keep another clock. Kept free of imports, so the typed address form
 * can list the states without pulling in the rest of the package.
 */
export const US_STATES = [
  { code: "AL", name: "Alabama", zones: ["America/Chicago"] },
  {
    code: "AK",
    name: "Alaska",
    zones: [
      "America/Anchorage",
      "America/Juneau",
      "America/Sitka",
      "America/Nome",
      "America/Yakutat",
      "America/Metlakatla",
      "America/Adak",
    ],
  },
  { code: "AZ", name: "Arizona", zones: ["America/Phoenix", "America/Denver"] },
  { code: "AR", name: "Arkansas", zones: ["America/Chicago"] },
  { code: "CA", name: "California", zones: ["America/Los_Angeles"] },
  { code: "CO", name: "Colorado", zones: ["America/Denver"] },
  { code: "CT", name: "Connecticut", zones: ["America/New_York"] },
  { code: "DE", name: "Delaware", zones: ["America/New_York"] },
  { code: "DC", name: "District of Columbia", zones: ["America/New_York"] },
  {
    code: "FL",
    name: "Florida",
    zones: ["America/New_York", "America/Chicago"],
  },
  { code: "GA", name: "Georgia", zones: ["America/New_York"] },
  { code: "HI", name: "Hawaii", zones: ["Pacific/Honolulu"] },
  {
    code: "ID",
    name: "Idaho",
    zones: ["America/Boise", "America/Los_Angeles"],
  },
  { code: "IL", name: "Illinois", zones: ["America/Chicago"] },
  {
    code: "IN",
    name: "Indiana",
    zones: [
      "America/Indiana/Indianapolis",
      "America/Chicago",
      "America/Indiana/Knox",
      "America/Indiana/Tell_City",
      "America/Indiana/Marengo",
      "America/Indiana/Petersburg",
      "America/Indiana/Vevay",
      "America/Indiana/Vincennes",
      "America/Indiana/Winamac",
    ],
  },
  { code: "IA", name: "Iowa", zones: ["America/Chicago"] },
  { code: "KS", name: "Kansas", zones: ["America/Chicago", "America/Denver"] },
  {
    code: "KY",
    name: "Kentucky",
    zones: [
      "America/New_York",
      "America/Kentucky/Louisville",
      "America/Kentucky/Monticello",
      "America/Chicago",
    ],
  },
  { code: "LA", name: "Louisiana", zones: ["America/Chicago"] },
  { code: "ME", name: "Maine", zones: ["America/New_York"] },
  { code: "MD", name: "Maryland", zones: ["America/New_York"] },
  { code: "MA", name: "Massachusetts", zones: ["America/New_York"] },
  {
    code: "MI",
    name: "Michigan",
    zones: ["America/Detroit", "America/Menominee"],
  },
  { code: "MN", name: "Minnesota", zones: ["America/Chicago"] },
  { code: "MS", name: "Mississippi", zones: ["America/Chicago"] },
  { code: "MO", name: "Missouri", zones: ["America/Chicago"] },
  { code: "MT", name: "Montana", zones: ["America/Denver"] },
  {
    code: "NE",
    name: "Nebraska",
    zones: ["America/Chicago", "America/Denver"],
  },
  {
    code: "NV",
    name: "Nevada",
    zones: ["America/Los_Angeles", "America/Denver"],
  },
  { code: "NH", name: "New Hampshire", zones: ["America/New_York"] },
  { code: "NJ", name: "New Jersey", zones: ["America/New_York"] },
  { code: "NM", name: "New Mexico", zones: ["America/Denver"] },
  { code: "NY", name: "New York", zones: ["America/New_York"] },
  { code: "NC", name: "North Carolina", zones: ["America/New_York"] },
  {
    code: "ND",
    name: "North Dakota",
    zones: [
      "America/Chicago",
      "America/North_Dakota/Center",
      "America/North_Dakota/New_Salem",
      "America/North_Dakota/Beulah",
      "America/Denver",
    ],
  },
  { code: "OH", name: "Ohio", zones: ["America/New_York"] },
  { code: "OK", name: "Oklahoma", zones: ["America/Chicago"] },
  {
    code: "OR",
    name: "Oregon",
    zones: ["America/Los_Angeles", "America/Boise"],
  },
  { code: "PA", name: "Pennsylvania", zones: ["America/New_York"] },
  { code: "RI", name: "Rhode Island", zones: ["America/New_York"] },
  { code: "SC", name: "South Carolina", zones: ["America/New_York"] },
  {
    code: "SD",
    name: "South Dakota",
    zones: ["America/Chicago", "America/Denver"],
  },
  {
    code: "TN",
    name: "Tennessee",
    zones: ["America/Chicago", "America/New_York"],
  },
  { code: "TX", name: "Texas", zones: ["America/Chicago", "America/Denver"] },
  { code: "UT", name: "Utah", zones: ["America/Denver"] },
  { code: "VT", name: "Vermont", zones: ["America/New_York"] },
  { code: "VA", name: "Virginia", zones: ["America/New_York"] },
  { code: "WA", name: "Washington", zones: ["America/Los_Angeles"] },
  { code: "WV", name: "West Virginia", zones: ["America/New_York"] },
  { code: "WI", name: "Wisconsin", zones: ["America/Chicago"] },
  { code: "WY", name: "Wyoming", zones: ["America/Denver"] },
  { code: "PR", name: "Puerto Rico", zones: ["America/Puerto_Rico"] },
  { code: "GU", name: "Guam", zones: ["Pacific/Guam"] },
  { code: "VI", name: "U.S. Virgin Islands", zones: ["America/St_Thomas"] },
  { code: "AS", name: "American Samoa", zones: ["Pacific/Pago_Pago"] },
  { code: "MP", name: "Northern Mariana Islands", zones: ["Pacific/Saipan"] },
] as const;

export type UsStateCode = (typeof US_STATES)[number]["code"];

/**
 * The time zone for a home, from its state. Where a state keeps more than one
 * clock, the member's own browser settles it when it's one of that state's
 * zones; otherwise it's the state's main zone. Null for anything that isn't a
 * US state or territory.
 */
export function homeTimezone(
  state: string,
  browserZone?: string | null,
): string | null {
  const found = US_STATES.find(
    (candidate) => candidate.code === state.trim().toUpperCase(),
  );
  if (!found) return null;
  const zones: readonly string[] = found.zones;
  return browserZone && zones.includes(browserZone) ? browserZone : zones[0]!;
}
