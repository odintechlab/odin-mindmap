const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Bucket = { count: number; resetAt: number };

/** Best-effort in-memory limiter (per server instance). */
const attempts = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkAdminUnlockAllowed(
  ip: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = attempts.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    return { ok: true };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  return { ok: true };
}

export function recordAdminUnlockFailure(ip: string): void {
  const now = Date.now();
  const bucket = attempts.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.count += 1;
}

export function clearAdminUnlockFailures(ip: string): void {
  attempts.delete(ip);
}
