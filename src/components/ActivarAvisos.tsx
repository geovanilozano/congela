"use client";

import { useEffect, useState } from "react";

// Convierte la clave pública VAPID (base64url) al formato que espera pushManager.subscribe.
function claveAUint8(base64: string): Uint8Array {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Estado = "cargando" | "no-soportado" | "sin-config" | "activo" | "inactivo" | "trabajando";

// Botón para activar las notificaciones push EN ESTE dispositivo (pide permiso, se suscribe
// y guarda la suscripción en el servidor). Degrada con gracia si el navegador no soporta o
// si faltan las llaves VAPID.
export function ActivarAvisos() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const clavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    // Detección de capacidades del navegador al montar (necesita window/navigator, que no
    // existen en el render del servidor): se refleja en el estado desde el efecto.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!clavePublica) {
      setEstado("sin-config");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setEstado("no-soportado");
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEstado(sub ? "activo" : "inactivo"))
      .catch(() => setEstado("inactivo"));
  }, [clavePublica]);

  const activar = async () => {
    if (!clavePublica) return;
    setEstado("trabajando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado("inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveAUint8(clavePublica) as BufferSource,
      });
      const res = await fetch("/api/push/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setEstado(res.ok ? "activo" : "inactivo");
    } catch {
      setEstado("inactivo");
    }
  };

  if (estado === "sin-config") {
    return <p className="text-sm text-slate-400">Los avisos aún no están configurados en el servidor.</p>;
  }
  if (estado === "no-soportado") {
    return (
      <p className="text-sm text-slate-400">
        Este navegador no soporta avisos. En iPhone, primero <b>instalá la app</b> (Compartir → Agregar a inicio) y activalos desde ahí.
      </p>
    );
  }
  if (estado === "activo") {
    return <p className="text-sm font-medium text-emerald-600">✓ Avisos activados en este dispositivo.</p>;
  }

  return (
    <button
      onClick={activar}
      disabled={estado === "cargando" || estado === "trabajando"}
      className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
    >
      {estado === "trabajando" ? "Activando…" : "🔔 Activar avisos en este celular"}
    </button>
  );
}
