"use client";

import { useOnlineStatus } from "@/hooks/useOfflineSync";

export function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="offline-pill pop-in flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-[11px] font-semibold select-none"
      title="Sin conexión: los cambios se guardan en el dispositivo y se sincronizan al volver"
    >
      <span className="live-dot is-offline" aria-hidden="true" />
      <span className="font-mono uppercase tracking-[0.12em]">Offline</span>
    </div>
  );
}
