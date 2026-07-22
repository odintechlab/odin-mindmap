"use client";

import { useCallback, useEffect, useState } from "react";

export type AdminUnlockResult = { ok: true } | { ok: false; error: string };

export function useAdminUnlocked() {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAdminUnlocked(data.unlocked === true);
      })
      .catch(() => {
        if (!cancelled) setAdminUnlocked(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unlockAdmin = useCallback(async (pin: string): Promise<AdminUnlockResult> => {
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        setAdminUnlocked(true);
        return { ok: true };
      }

      if (res.status === 429) {
        return { ok: false, error: "Too many attempts. Try again later." };
      }
      if (res.status === 503) {
        return { ok: false, error: "Admin PIN is not configured." };
      }

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? "Wrong PIN" };
    } catch {
      return { ok: false, error: "Unable to unlock. Please try again." };
    }
  }, []);

  const lockAdmin = useCallback(async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAdminUnlocked(false);
  }, []);

  return { adminUnlocked, loading, unlockAdmin, lockAdmin };
}
