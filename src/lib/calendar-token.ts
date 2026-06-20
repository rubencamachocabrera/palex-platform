import { createHmac } from "crypto"

/**
 * Generates a deterministic calendar token from a userId.
 * Same userId always produces the same token — no DB storage needed.
 * Uses HMAC-SHA256 with AUTH_SECRET as key.
 */
export function generateCalendarToken(userId: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET || "fallback")
    .update(userId)
    .digest("hex")
    .slice(0, 32)
}
