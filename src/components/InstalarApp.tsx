"use client";

import { useEffect, useState } from "react";

// Evento no estándar de Chrome/Android para instalar una PWA.
interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLAVE_DESCARTADO = "instalar-descartado";

// Aviso discreto para "Agregar a pantalla de inicio":
// - Android/Chrome: captura beforeinstallprompt y muestra un botón que dispara el prompt nativo.
// - iOS/Safari (no soporta el prompt): muestra las instrucciones manuales.
// - Oculto si la app ya está instalada (modo standalone) o si el usuario ya lo descartó.
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(CLAVE_DESCARTADO) === "1") return;

    const nav = navigator as Navigator & { standalone?: boolean };
    const yaInstalada = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (yaInstalada) return;

    // iOS Safari (no otros navegadores de iOS): instrucciones manuales. La detección
    // necesita `navigator` (no existe en el render del servidor), por eso va en el efecto.
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setEsIOS(true);
      setVisible(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const alInstalar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", alInstalar);
    return () => window.removeEventListener("beforeinstallprompt", alInstalar);
  }, []);

  if (!visible) return null;

  const cerrar = () => {
    setVisible(false);
    localStorage.setItem(CLAVE_DESCARTADO, "1");
  };

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    cerrar();
  };

  return (
    <div className="no-print fixed inset-x-3 bottom-20 z-40 rounded-xl border border-sky-200 bg-white p-3 shadow-lg lg:inset-x-auto lg:bottom-4 lg:right-4 lg:max-w-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📲</span>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold text-slate-800">Instalá Congela en tu celular</div>
          {esIOS ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Tocá <b>Compartir</b> ⬆️ abajo y luego <b>“Agregar a inicio”</b>. Así queda como una app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">Ábrela como app, a pantalla completa y con avisos.</p>
          )}
          {!esIOS && (
            <button
              onClick={instalar}
              className="mt-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
            >
              Instalar app
            </button>
          )}
        </div>
        <button onClick={cerrar} aria-label="Cerrar aviso" className="shrink-0 text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>
    </div>
  );
}
