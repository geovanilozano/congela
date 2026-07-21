"use client";

import { useEffect } from "react";

// Registra el service worker (/sw.js) una vez, para que la app abra al instante y tenga
// pantalla offline. No renderiza nada. El proxy ya deja pasar /sw.js sin sesión.
export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Silencioso: si el SW no registra, la app sigue funcionando normal (solo sin offline).
      });
    }
  }, []);
  return null;
}
