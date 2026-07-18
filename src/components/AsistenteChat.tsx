"use client";

import { useState } from "react";
import { preguntar, type RespuestaAsistente } from "@/app/asistente/actions";

type Turno = { pregunta: string; respuesta?: string; error?: string; cargando?: boolean };

const SUGERENCIAS = [
  "¿Cuánto vendí esta semana?",
  "¿Quién me debe más?",
  "Resúmeme el mes",
  "¿Qué insumo está por acabarse?",
];

export function AsistenteChat() {
  const [texto, setTexto] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(false);

  async function enviar(preguntaTexto: string) {
    const q = preguntaTexto.trim();
    if (!q || cargando) return;
    setTexto("");
    setCargando(true);
    setTurnos((t) => [...t, { pregunta: q, cargando: true }]);

    const cerrarUltimo = (patch: Partial<Turno>) =>
      setTurnos((t) => t.map((turno, i) => (i === t.length - 1 ? { ...turno, ...patch, cargando: false } : turno)));

    try {
      const r: RespuestaAsistente = await preguntar(q);
      cerrarUltimo(r.ok ? { respuesta: r.respuesta } : { error: r.error });
    } catch {
      cerrarUltimo({ error: "No se pudo consultar. Intenta de nuevo." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => enviar(s)}
            disabled={cargando}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {turnos.length > 0 && (
        <div className="space-y-3">
          {turnos.map((t, i) => (
            <div key={i} className="space-y-2">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-sky-600 px-4 py-2 text-sm text-white">
                {t.pregunta}
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
                {t.cargando && <span className="text-slate-400">Pensando…</span>}
                {t.error && <span className="text-red-600">⚠️ {t.error}</span>}
                {t.respuesta && <span className="whitespace-pre-wrap">{t.respuesta}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex gap-2"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={cargando}
          placeholder="Pregunta sobre tu negocio…"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={cargando || !texto.trim()}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {cargando ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
