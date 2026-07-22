import { timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "odin_admin_session";

/** Server-only admin PIN. Returns null if not configured. */
export function getAdminPin(): string | null {
  const pin = process.env.ADMIN_PIN?.trim();
  return pin || null;
}

export function isAdminRequest(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=1(?:;|$)`).test(cookie);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Constant-time string compare for PIN checks. */
export function safeEqualPin(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Spend comparable work so length mismatch isn't a free early exit.
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}
