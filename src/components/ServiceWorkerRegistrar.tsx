"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registrado:", reg.scope);

          // Escuchar mensajes del SW (ej: SYNC_REQUESTED)
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data?.type === "SYNC_REQUESTED") {
              // Disparar evento global para que useOfflineSync lo procese
              window.dispatchEvent(new CustomEvent("palex-sync-requested"));
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Error al registrar Service Worker:", err);
        });
    }
  }, []);

  return null;
}
