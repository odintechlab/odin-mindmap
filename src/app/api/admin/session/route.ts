import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  getAdminPin,
  safeEqualPin,
} from "@/lib/admin";
import {
  checkAdminUnlockAllowed,
  clearAdminUnlockFailures,
  getClientIp,
  recordAdminUnlockFailure,
} from "@/lib/adminRateLimit";

export async function GET() {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  return Response.json({ unlocked });
}

export async function POST(request: Request) {
  const adminPin = getAdminPin();
  if (!adminPin) {
    return Response.json({ error: "Admin PIN is not configured" }, { status: 503 });
  }

  const ip = getClientIp(request);
  const allowed = checkAdminUnlockAllowed(ip);
  if (!allowed.ok) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(allowed.retryAfterSec) },
      },
    );
  }

  let pin: string | undefined;
  try {
    const body = (await request.json()) as { pin?: string };
    pin = typeof body.pin === "string" ? body.pin : undefined;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!pin || !safeEqualPin(pin, adminPin)) {
    recordAdminUnlockFailure(ip);
    return Response.json({ error: "Invalid PIN" }, { status: 401 });
  }

  clearAdminUnlockFailures(ip);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "1", adminCookieOptions());

  return Response.json({ unlocked: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  return Response.json({ unlocked: false });
}
