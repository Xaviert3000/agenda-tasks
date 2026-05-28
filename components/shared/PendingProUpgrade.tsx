"use client";

import { useEffect } from "react";

const STORAGE_KEY = "agenda_pending_pro_upgrade";

export function savePendingProUpgrade(workspaceId: string, workspaceSlug: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workspaceId, workspaceSlug }));
}

export function PendingProUpgrade({ currentSlug }: { currentSlug: string }) {
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let pending: { workspaceId: string; workspaceSlug: string };
    try {
      pending = JSON.parse(raw);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (pending.workspaceSlug !== currentSlug) return;

    localStorage.removeItem(STORAGE_KEY);

    fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: pending.workspaceId,
        workspaceSlug: pending.workspaceSlug,
      }),
    })
      .then((r) => r.json())
      .then(({ url }) => {
        if (url) window.location.href = url;
      });
  }, [currentSlug]);

  return null;
}
