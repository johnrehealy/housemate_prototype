"use client";

import type {
  AddressSuggestion,
  ResolvedAddress,
} from "@housemate/core/address";
import { US_STATES } from "@housemate/core/address/states";
import { CaretDown, MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { InsetField, InsetMessage } from "@/components/onboarding/inset-field";
import { resolveAddress, suggestAddresses } from "./actions";

/*
 * G2's answer (docs/design.md §4 Get started, Address search, D-068, D-072): one
 * search field with Google's suggestions and a map of the picked spot, or the
 * address typed in parts. Typing is always available; while the lookup is
 * off it's the only way.
 */

export type ManualAddress = {
  line1: string;
  city: string;
  state: string;
  zip: string;
};

export type AddressValue = {
  mode: "search" | "manual";
  query: string;
  picked: ResolvedAddress | null;
  manual: ManualAddress;
  unit: string;
};

export const EMPTY_ADDRESS: AddressValue = {
  mode: "search",
  query: "",
  picked: null,
  manual: { line1: "", city: "", state: "", zip: "" },
  unit: "",
};

export type AddressErrors = Partial<
  Record<"search" | "line1" | "city" | "state" | "zip", string>
>;

/** The step's own check, on the device, before Continue moves on. */
export function checkAddress(value: AddressValue): AddressErrors {
  if (value.mode === "search") {
    return value.picked
      ? {}
      : { search: "Pick your address from the list, or enter it yourself." };
  }
  const errors: AddressErrors = {};
  if (!value.manual.line1.trim()) errors.line1 = "Enter your street address.";
  if (!value.manual.city.trim()) errors.city = "Enter your city.";
  if (!value.manual.state) errors.state = "Choose your state.";
  if (!/^\d{5}$/.test(value.manual.zip.trim())) {
    errors.zip = "Enter a 5-digit ZIP code.";
  }
  return errors;
}

export function pickedLine(address: ResolvedAddress): string {
  return `${address.line1}, ${address.city}, ${address.state} ${address.zip}`;
}

function newSessionToken() {
  return crypto.randomUUID();
}

const PANEL_SHADOW =
  "shadow-[0_12px_32px_rgba(20,52,47,0.10),0_2px_6px_rgba(20,52,47,0.06)]";

export function AddressStep({
  token,
  lookupEnabled,
  value,
  onChange,
  errors,
}: {
  /** The link the page was opened from; none from the website. */
  token?: string;
  lookupEnabled: boolean;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors: AddressErrors;
}) {
  const manual = !lookupEnabled || value.mode === "manual";

  return (
    <div className="flex flex-col gap-4">
      {manual ? (
        <ManualFields
          value={value}
          onChange={onChange}
          errors={errors}
          canSearch={lookupEnabled}
        />
      ) : (
        <SearchFields
          token={token}
          value={value}
          onChange={onChange}
          error={errors.search}
        />
      )}
    </div>
  );
}

function UnitField({
  value,
  onChange,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}) {
  return (
    <InsetField
      id="unit"
      label="Apt or unit"
      className="md:w-[132px] md:shrink-0"
      control={(valueClass) => (
        <input
          id="unit"
          name="unit"
          autoComplete="address-line2"
          placeholder="Optional"
          value={value.unit}
          onChange={(event) => onChange({ ...value, unit: event.target.value })}
          className={valueClass}
        />
      )}
    />
  );
}

function SearchFields({
  token,
  value,
  onChange,
  error,
}: {
  /** The link the page was opened from; none from the website. */
  token?: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  error?: string;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const sessionToken = useRef(newSessionToken());
  const [suggestions, setSuggestions] = useState<AddressSuggestion[] | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [resolving, setResolving] = useState(false);

  const typed = value.query.trim();
  const searching = !value.picked && typed.length >= 3;

  useEffect(() => {
    if (!searching) return;
    // Only the newest request's answer is shown.
    let current = true;
    const timer = setTimeout(async () => {
      const found = await suggestAddresses(token, typed, sessionToken.current);
      if (!current) return;
      setSuggestions(found ?? []);
      setHighlight(0);
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [searching, typed, token]);

  async function pick(suggestion: AddressSuggestion) {
    setOpen(false);
    setResolving(true);
    const resolved = await resolveAddress(
      token,
      suggestion.placeId,
      sessionToken.current,
    );
    setResolving(false);
    // A search session ends with its pick.
    sessionToken.current = newSessionToken();
    if (!resolved) {
      setSuggestions([]);
      setOpen(true);
      return;
    }
    onChange({ ...value, picked: resolved, query: pickedLine(resolved) });
    // On to the next field, as G2 draws it.
    document.getElementById("unit")?.focus();
  }

  function clear() {
    onChange({ ...value, picked: null, query: "" });
    setSuggestions(null);
    input.current?.focus();
  }

  function enterByHand() {
    setOpen(false);
    onChange({
      ...value,
      mode: "manual",
      picked: null,
      manual: { ...value.manual, line1: value.picked ? "" : value.query },
    });
  }

  const rows = suggestions ?? [];
  const showPanel = open && searching && suggestions !== null;
  const activeId =
    showPanel && rows.length > 0 ? `${listId}-${highlight}` : undefined;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showPanel) {
      if (event.key === "ArrowDown" && searching) setOpen(true);
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlight((index) => Math.min(index + 1, rows.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlight((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const row = rows[highlight];
        if (row) {
          // Picks rather than submitting the step.
          event.preventDefault();
          void pick(row);
        }
        break;
      }
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
    }
  }

  const Glyph = value.picked ? MapPin : MagnifyingGlass;

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        <div
          className="relative min-w-0 flex-1"
          // The panel stays open while focus is in the field, on Clear or on
          // "Enter it yourself", so Tab reaches the link.
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setOpen(false);
            }
          }}
        >
          <InsetField
            id="address"
            label="Home address"
            tone={error ? "error" : "resting"}
            leading={
              <Glyph
                size={20}
                aria-hidden
                className={`shrink-0 ${value.picked ? "text-evergreen" : "text-muted"}`}
              />
            }
            trailing={
              value.query ? (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear the address"
                  className="-mr-2.5 flex size-8 shrink-0 items-center justify-center rounded-sm text-muted transition-colors duration-120 ease-out hover:text-body focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen)]"
                >
                  <X size={18} aria-hidden />
                </button>
              ) : null
            }
            message={<InsetMessage id="address-message" error={error} />}
            control={(valueClass) => (
              <input
                ref={input}
                id="address"
                name="address"
                role="combobox"
                aria-expanded={showPanel}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "address-message" : undefined}
                autoComplete="off"
                placeholder="Start typing your address"
                value={value.query}
                onChange={(event) => {
                  const query = event.target.value;
                  onChange({ ...value, query, picked: null });
                  // Too short to search: drop the last answer, so it isn't
                  // shown again for a different address.
                  if (query.trim().length < 3) setSuggestions(null);
                  setOpen(true);
                }}
                onFocus={(event) => {
                  setOpen(true);
                  // On a phone, lift the field so the list clears the keyboard.
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    event.currentTarget.scrollIntoView({ block: "start" });
                  }
                }}
                onKeyDown={onKeyDown}
                className={`${valueClass} truncate`}
              />
            )}
          />

          {showPanel ? (
            // 8px under the field, or under its error, so the error shows.
            <div
              className={`absolute top-[calc(100%+8px)] right-0 left-0 z-10 rounded-lg border border-line-strong bg-surface p-1.5 ${PANEL_SHADOW}`}
              // Keeps focus in the field while a row or link is pressed.
              onMouseDown={(event) => event.preventDefault()}
            >
              <ul id={listId} role="listbox" aria-label="Addresses">
                {rows.map((row, index) => (
                  <li
                    key={row.placeId}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === highlight}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => void pick(row)}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 ${
                      index === highlight ? "bg-nav" : ""
                    }`}
                  >
                    <MapPin
                      size={20}
                      aria-hidden
                      className={`shrink-0 ${index === highlight ? "text-evergreen" : "text-muted"}`}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-label text-heading">
                        <Highlighted suggestion={row} />
                      </span>
                      <span className="truncate text-xs text-muted">
                        {row.secondary}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {rows.length === 0 ? (
                <div role="status" className="flex flex-col px-2.5 py-2">
                  <span className="text-label text-heading">
                    We can&rsquo;t find that address
                  </span>
                  <span className="text-xs text-muted">
                    Check the spelling, or enter it yourself.
                  </span>
                </div>
              ) : null}
              {/* A 24px target for the link (WCAG 2.5.8), so the footer
                  is 4px taller than the board's 20px line. */}
              <div className="flex items-center justify-between border-t border-line px-2.5 pt-2.5 pb-1.5">
                <button
                  type="button"
                  onClick={enterByHand}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    event.preventDefault();
                    input.current?.focus();
                    setOpen(false);
                  }}
                  className="h-6 rounded-sm text-xs text-body underline decoration-1 underline-offset-3 focus-visible:outline-2 focus-visible:outline-evergreen"
                >
                  {rows.length === 0
                    ? "Enter it yourself"
                    : "Can’t find it? Enter it yourself"}
                </button>
                <span className="text-2xs font-bold text-muted">
                  Google Maps
                </span>
              </div>
            </div>
          ) : null}
        </div>
        <UnitField value={value} onChange={onChange} />
      </div>

      {value.picked || resolving ? (
        <div className="h-[184px] overflow-clip rounded-lg border border-line-strong bg-nav">
          {value.picked?.map ? (
            // A data URL from our server, so no address or coordinates are in
            // a URL anywhere. next/image can't optimise one, and needn't.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.picked.map}
              alt={`Map of ${value.picked.line1}`}
              className="size-full object-cover"
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** The street line with the typed part in bold. */
function Highlighted({ suggestion }: { suggestion: AddressSuggestion }) {
  const text = suggestion.primary;
  const parts: { text: string; bold: boolean }[] = [];
  let at = 0;
  for (const { start, end } of [...suggestion.primaryMatches].sort(
    (a, b) => a.start - b.start,
  )) {
    if (start > at) parts.push({ text: text.slice(at, start), bold: false });
    if (end > start) {
      parts.push({ text: text.slice(Math.max(start, at), end), bold: true });
    }
    at = Math.max(at, end);
  }
  if (at < text.length) parts.push({ text: text.slice(at), bold: false });
  return (
    <>
      {parts.map((part, index) =>
        part.bold ? (
          <b key={index} className="font-bold">
            {part.text}
          </b>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function ManualFields({
  value,
  onChange,
  errors,
  canSearch,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors: AddressErrors;
  canSearch: boolean;
}) {
  const set = (part: keyof ManualAddress, next: string) =>
    onChange({ ...value, manual: { ...value.manual, [part]: next } });

  const text = (
    part: "line1" | "city" | "zip",
    label: string,
    autoComplete: string,
    extra: { inputMode?: "numeric"; maxLength?: number; autoFocus?: boolean },
    className = "",
  ) => (
    <InsetField
      id={part}
      label={label}
      tone={errors[part] ? "error" : "resting"}
      className={className}
      message={<InsetMessage id={`${part}-message`} error={errors[part]} />}
      control={(valueClass) => (
        <input
          id={part}
          name={part}
          autoComplete={autoComplete}
          value={value.manual[part]}
          onChange={(event) => set(part, event.target.value)}
          aria-invalid={errors[part] ? true : undefined}
          aria-describedby={errors[part] ? `${part}-message` : undefined}
          className={valueClass}
          {...extra}
        />
      )}
    />
  );

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        {text(
          "line1",
          "Street address",
          "address-line1",
          { autoFocus: canSearch },
          "flex-1",
        )}
        <UnitField value={value} onChange={onChange} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_96px_104px] items-start gap-3 md:grid-cols-[minmax(0,1fr)_132px_132px] md:gap-4">
        {text("city", "City", "address-level2", {})}
        <InsetField
          id="state"
          label="State"
          tone={errors.state ? "error" : "resting"}
          message={<InsetMessage id="state-message" error={errors.state} />}
          trailing={
            <CaretDown
              size={16}
              aria-hidden
              className="pointer-events-none -ml-1 shrink-0 text-muted"
            />
          }
          control={(valueClass) => (
            <select
              id="state"
              name="state"
              autoComplete="address-level1"
              value={value.manual.state}
              onChange={(event) => set("state", event.target.value)}
              aria-invalid={errors.state ? true : undefined}
              aria-describedby={errors.state ? "state-message" : undefined}
              className={`${valueClass} cursor-pointer appearance-none ${
                value.manual.state ? "" : "text-muted"
              }`}
            >
              <option value="" disabled>
                Choose
              </option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.code}
                </option>
              ))}
            </select>
          )}
        />
        {text("zip", "ZIP code", "postal-code", {
          inputMode: "numeric",
          maxLength: 5,
        })}
      </div>
      {canSearch ? (
        <button
          type="button"
          onClick={() => {
            // The button goes with the typed fields, so focus moves to the
            // search field rather than dropping to the page.
            flushSync(() =>
              onChange({
                ...value,
                mode: "search",
                query: value.manual.line1,
                picked: null,
              }),
            );
            document.getElementById("address")?.focus();
          }}
          className="group -ml-1 flex h-9 items-center gap-2 self-start rounded-sm px-1 text-label text-evergreen focus-visible:outline-2 focus-visible:outline-evergreen"
        >
          <MagnifyingGlass size={18} aria-hidden className="shrink-0" />
          <span className="underline decoration-1 underline-offset-3 group-hover:decoration-2">
            Search for your address instead
          </span>
        </button>
      ) : null}
    </>
  );
}
