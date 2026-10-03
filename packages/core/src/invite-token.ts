import { createHash, randomBytes } from "node:crypto";

/**
 * The secret in a personal invite link (D-068): 32 random bytes, so a link
 * can't be guessed. Only its hash is stored.
 */
export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the invites table keeps in place of the token: SHA-256, hex. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
