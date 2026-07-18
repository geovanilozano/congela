"use client";

import { useRef, useState } from "react";

// Campo de foto + botón que lee una factura de GASTO con IA y rellena el formulario de
// Gastos. La misma foto queda como comprobante (input name="foto").
export function LectorFotoGasto() {
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
      const r = await fetch("/api/ocr-gasto", { method: "POST", body: fd });
      const data = await r.json();
      if (!data.ok) {
        setEstado("⚠️ " + (data.error || "No se pudo leer la factura."));
        return;
      }
      const form = inputRef.current?.closest("form");
      if (form) {
        const d = data.datos;
        const setPlain = (name: string, value: unknown) => {
          const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
          if (el && value != null && value !== "") el.value = String(value);
        };
        setPlain("descripcion", d.descripcion);
        setPlain("proveedor", d.proveedor);
        setPlain("fecha", d.fecha);
        setPlain("categoria", d.categoria);

        // El valor usa InputDinero (input controlado por React): se actualiza su input
        // visible con el setter nativo + un evento "input" para que React tome el cambio.
        if (d.valorPesos != null) {
          const vis = form.querySelector("#gastoValor") as HTMLInputElement | null;
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          if (vis && setter) {
            setter.call(vis, String(Math.round(d.valorPesos)));
            vis.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
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
      <span className="text-slate-500">Foto del comprobante</span>
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
