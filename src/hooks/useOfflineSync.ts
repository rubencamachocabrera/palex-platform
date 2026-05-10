"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  saveDraft,
  getDraft,
  enqueueSync,
  getSyncQueue,
  removeSyncItem,
  incrementSyncAttempt,
} from "@/lib/offline-db";

const MAX_ATTEMPTS = 3;
const AUTOSAVE_DELAY = 2000; // ms

// ─── Estado de conexión ───────────────────────────────────────────────────────

export function useOnlineStatus() {
  // Always start true on server — window check is the reliable SSR guard.
  // navigator.onLine exists in Node 18+ but returns false in server envs.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Sync actual status once mounted in the browser
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

interface UseOfflineSyncOptions {
  visitaId: string;
  hospitalNombre: string;
  datos: Record<string, unknown>;
  onSyncSuccess?: () => void;
  onSyncError?: (err: Error) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error" | "pending-sync";

export function useOfflineSync({
  visitaId,
  hospitalNombre,
  datos,
  onSyncSuccess,
  onSyncError,
}: UseOfflineSyncOptions) {
  const online = useOnlineStatus();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const datosRef = useRef(datos);

  // Mantener ref actualizada sin retrigger del efecto
  datosRef.current = datos;

  // ── Auto-save local al cambiar datos ───────────────────────────────────────
  useEffect(() => {
    if (!visitaId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setStatus("saving");
        await saveDraft({
          id: visitaId,
          hospitalNombre,
          datos: datosRef.current,
          updatedAt: Date.now(),
        });
        setLastSaved(Date.now());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, visitaId]);

  // ── Cargar borrador guardado ───────────────────────────────────────────────
  const loadDraft = useCallback(async () => {
    const draft = await getDraft(visitaId);
    return draft?.datos ?? null;
  }, [visitaId]);

  // ── Enviar al servidor (con fallback a cola) ───────────────────────────────
  const syncToServer = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!online) {
        // Sin conexión → encolar para después
        await enqueueSync({ id: visitaId, payload });
        setStatus("pending-sync");
        return false;
      }

      try {
        setStatus("saving");
        const res = await fetch(`/api/visitas/${visitaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStatus("saved");
        setLastSaved(Date.now());
        onSyncSuccess?.();
        return true;
      } catch (err) {
        // Error de red → encolar
        await enqueueSync({ id: visitaId, payload });
        setStatus("pending-sync");
        onSyncError?.(err as Error);
        return false;
      }
    },
    [online, visitaId, onSyncSuccess, onSyncError]
  );

  // ── Procesar cola cuando vuelve la conexión ────────────────────────────────
  useEffect(() => {
    if (!online) return;

    async function flushQueue() {
      const queue = await getSyncQueue();
      for (const item of queue) {
        if (item.attempts >= MAX_ATTEMPTS) {
          await removeSyncItem(item.id);
          continue;
        }
        try {
          const res = await fetch(`/api/visitas/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
          if (res.ok) {
            await removeSyncItem(item.id);
          } else {
            await incrementSyncAttempt(item.id);
          }
        } catch {
          await incrementSyncAttempt(item.id);
        }
      }
    }

    flushQueue();

    // Tambien al recibir senal del SW
    const handler = () => flushQueue();
    window.addEventListener("palex-sync-requested", handler);
    return () => window.removeEventListener("palex-sync-requested", handler);
  }, [online]);

  return { online, status, lastSaved, loadDraft, syncToServer };
}
