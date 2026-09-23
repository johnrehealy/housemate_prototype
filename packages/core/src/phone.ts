/**
 * Turns what someone types into E.164, or null when it isn't a phone number.
 * The pilot is US-only, so a bare 10-digit number is assumed to be +1.
 */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    const candidate = `+${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(candidate) ? candidate : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/**
 * Turns E.164 back into the way a US number is written, for showing a member
 * the number they just typed. Anything that isn't a 10-digit US number is
 * returned unchanged, so this never hides what was actually dialled.
 */
export function formatUsPhone(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164.trim());
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}
