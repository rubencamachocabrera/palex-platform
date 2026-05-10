"use client";

import { useOnlineStatus } from "@/hooks/useOfflineSync";

export function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium select-none">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      Sin conexión
    </div>
  );
}
