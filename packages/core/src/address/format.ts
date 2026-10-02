import type { AddressParts } from "./types";

/**
 * A home's address on one line, as the home record keeps it:
 * "1450 Sample Street, Apt 2, Testville, IL 00001".
 */
export function formatAddress(address: AddressParts & { unit?: string }) {
  const street = [address.line1, address.unit].filter(Boolean).join(", ");
  return `${street}, ${address.city}, ${address.state} ${address.zip}`;
}
