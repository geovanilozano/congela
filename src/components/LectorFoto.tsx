"use client";

import { useRef, useState } from "react";

// Campo de foto + botón que lee los datos de la factura con IA y rellena el formulario.
export function LectorFoto() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(false);

  async function leer() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setEstado("Primero selecciona o toma la foto de la factura.");
      return;
    }
    setCargando(true);
    setEstado("Leyendo la factura con IA…");
    try {
      const fd = new FormData();
      fd.append("foto", file);
      const r = await fetch("/api/ocr", { method: "POST", body: fd });
      const data = await r.json();
      if (!data.ok) {
        setEstado("⚠️ " + (data.error || "No se pudo leer la factura."));
        return;
      }
      const form = inputRef.current?.closest("form");
      if (form) {
        const set = (name: string, value: unknown) => {
          const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
          if (el && value != null && value !== "") el.value = String(value);
        };
        set("tipo", data.datos.tipo);
        set("valorPesos", data.datos.valorPesos);
        set("consumo", data.datos.consumo);
        set("periodoFin", data.datos.fecha);
      }
      setEstado("✅ Datos leídos. Revísalos y presiona Guardar.");
    } catch {
      setEstado("⚠️ Error al leer la factura.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <span className="text-slate-500">Foto del recibo</span>
      <input
        ref={inputRef}
        name="foto"
        type="file"
        accept="image/*"
        capture="environment"
        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={leer}
        disabled={cargando}
        className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {cargando ? "Leyendo…" : "🔍 Leer datos de la foto (IA)"}
      </button>
      {estado && <p className="mt-1 text-xs text-slate-500">{estado}</p>}
    </div>
  );
}
