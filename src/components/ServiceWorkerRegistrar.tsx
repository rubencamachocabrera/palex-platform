"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Solo recargar si se SUSTITUYE un SW que ya controlaba la página. En la
      // primera instalación clients.claim() también dispara controllerchange y
      // provocaba una recarga completa sin motivo.
      const hadController = !!navigator.serviceWorker.controller
      let reloading = false
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registrado:", reg.scope);

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });

          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data?.type === "SYNC_REQUESTED") {
              window.dispatchEvent(new CustomEvent("palex-sync-requested"));
            }
          });

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!hadController || reloading) return;
            reloading = true;
            window.location.reload();
          });
        })
        .catch((err) => {
          console.warn("[PWA] Error al registrar Service Worker:", err);
        });
    }
  }, []);

  return null;
}
