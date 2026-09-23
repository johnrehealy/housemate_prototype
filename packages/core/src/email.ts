/**
 * Normalizes what someone types into an email address, or null when it isn't
 * one. Lowercased and trimmed, so one address is one waitlist row however it
 * was typed.
 *
 * The check is deliberately loose. The only way to know an address is real is
 * to send to it, and a strict pattern turns away valid addresses for no gain.
 * This refuses whitespace, a missing @, a domain with no dot, and anything
 * over the 254 characters RFC 5321 allows.
 */
export function toEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
