"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/finance/money";
import { liquidarMedidor } from "@/lib/finance/medidor";
import { BotonGuardar } from "@/components/BotonGuardar";

// Formulario para liquidar un periodo del medidor de un cliente. Muestra EN VIVO cuánto
// se le va a cobrar mientras se escriben las lecturas y los datos del extracto, y al
// guardar manda todo al server action. El subsidio y el alumbrado se calculan solos:
// el usuario solo pone los % del extracto (o deja los que trae por defecto).
export function FormLiquidacion({
  medidorId,
  factor,
  accion,
  tarifaPesosDefault,
  lecturaAnteriorDefault,
  fechaAnteriorDefault,
  subsidioPctDefault,
  subsistenciaDefault,
  alumbradoPctDefault,
  consumoTotalDefault,
}: {
  medidorId: number;
  factor: number;
  accion: (fd: FormData) => void | Promise<void>;
  tarifaPesosDefault: number | null;
  lecturaAnteriorDefault: number | null;
  fechaAnteriorDefault: string;
  subsidioPctDefault: number;
  subsistenciaDefault: number;
  alumbradoPctDefault: number;
  consumoTotalDefault: number | null;
}) {
  const [f, setF] = useState({
    lecturaAnterior: lecturaAnteriorDefault != null ? String(lecturaAnteriorDefault) : "",
    lecturaActual: "",
    tarifaPesos: tarifaPesosDefault != null ? String(tarifaPesosDefault) : "",
    subsidioPct: String(subsidioPctDefault),
    subsistenciaKwh: String(subsistenciaDefault),
    consumoTotalKwh: consumoTotalDefault ? String(consumoTotalDefault) : "",
    alumbradoPct: String(alumbradoPctDefault),
    aseoTotalPesos: "",
    aseoPct: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const r = liquidarMedidor({
    lecturaAnterior: num(f.lecturaAnterior),
    lecturaActual: num(f.lecturaActual),
    factor,
    tarifaCuCents: Math.round(num(f.tarifaPesos) * 100),
    subsidioPct: num(f.subsidioPct),
    subsistenciaKwh: num(f.subsistenciaKwh),
    consumoTotalKwh: num(f.consumoTotalKwh),
    alumbradoPct: num(f.alumbradoPct),
    aseoTotalCents: Math.round(num(f.aseoTotalPesos) * 100),
    aseoPct: num(f.aseoPct),
  });

  const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm";
  const numProps = { inputMode: "numeric" as const };

  return (
    <form action={accion} className="grid gap-5 lg:grid-cols-3">
      <input type="hidden" name="medidorId" value={medidorId} />

      {/* Columna de datos */}
      <div className="space-y-4 lg:col-span-2">
        {/* Periodo */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500">Fecha lectura anterior</span>
            <input type="date" name="fechaAnterior" defaultValue={fechaAnteriorDefault} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Fecha lectura actual</span>
            <input type="date" name="fechaActual" className={inputCls} />
          </label>
        </div>

        {/* Lecturas */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500">Lectura anterior (kWh)</span>
            <input {...numProps} name="lecturaAnterior" value={f.lecturaAnterior} onChange={set("lecturaAnterior")} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Lectura actual (kWh)</span>
            <input {...numProps} name="lecturaActual" value={f.lecturaActual} onChange={set("lecturaActual")} required className={inputCls} />
          </label>
        </div>

        {/* Datos del extracto */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Datos del extracto</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-slate-500">Tarifa CU ($/kWh)</span>
              <input {...numProps} name="tarifaPesos" value={f.tarifaPesos} onChange={set("tarifaPesos")} placeholder="824.03" required className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-slate-500">Subsidio del extracto (%)</span>
              <input {...numProps} name="subsidioPct" value={f.subsidioPct} onChange={set("subsidioPct")} placeholder="50" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-slate-500">Alumbrado público (% de la energía)</span>
              <input {...numProps} name="alumbradoPct" value={f.alumbradoPct} onChange={set("alumbradoPct")} placeholder="6" className={inputCls} />
            </label>
            <label className="text-sm">
              <span className="text-slate-500">Consumo de subsistencia (kWh)</span>
              <input {...numProps} name="subsistenciaKwh" value={f.subsistenciaKwh} onChange={set("subsistenciaKwh")} placeholder="173" className={inputCls} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-slate-500">Consumo TOTAL del recibo (kWh) — si varios medidores comparten el recibo</span>
              <input {...numProps} name="consumoTotalKwh" value={f.consumoTotalKwh} onChange={set("consumoTotalKwh")} placeholder="0 = este medidor es el único" className={inputCls} />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            El subsidio solo aplica hasta el consumo de subsistencia (por eso a consumos altos no se
            descuenta todo). En Barrancabermeja el alumbrado es ~6% y la subsistencia ~173 kWh.
            <br />
            <b>Varios medidores en un mismo recibo:</b> escribí el consumo TOTAL del recibo y el
            subsidio (que es uno solo) se reparte entre ellos según lo que consumió cada uno. Dejalo
            en 0 si este medidor es el único del recibo.
          </p>
        </div>

        {/* Aseo (opcional) */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500">Aseo total del extracto ($) — opcional</span>
            <input {...numProps} name="aseoTotalPesos" value={f.aseoTotalPesos} onChange={set("aseoTotalPesos")} placeholder="0" className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">% de aseo que paga el cliente</span>
            <input {...numProps} name="aseoPct" value={f.aseoPct} onChange={set("aseoPct")} placeholder="0" className={inputCls} />
          </label>
        </div>

        {/* Foto de la lectura */}
        <label className="block text-sm">
          <span className="text-slate-500">Foto de la lectura (opcional)</span>
          <input type="file" name="foto" accept="image/*" capture="environment" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1 file:text-sky-700" />
        </label>
      </div>

      {/* Vista previa (la "factura" del cliente en vivo) */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Lo que se le cobra</div>
          <div className="mt-3 space-y-1.5 text-sm">
            <Fila etiqueta={`Consumo: ${r.consumoKwh} kWh`} valor={formatMoney(r.energiaCents)} />
            {r.subsidioCents > 0 && (
              <>
                <Fila etiqueta="Descuento (subsidio)" valor={`− ${formatMoney(r.subsidioCents)}`} rojo />
                <p className="-mt-1 pl-1 text-[11px] text-slate-400">
                  {num(f.subsidioPct)}%
                  {num(f.consumoTotalKwh) > 0
                    ? ` · tu parte del recibo (${num(f.consumoTotalKwh)} kWh)`
                    : ` sobre ${r.kwhSubsidiado} de ${r.consumoKwh} kWh`}
                  {r.energiaCents > 0 && ` · ${Math.round((r.subsidioCents / r.energiaCents) * 100)}% real`}
                </p>
              </>
            )}
            {r.alumbradoClienteCents > 0 && <Fila etiqueta="Alumbrado público" valor={`+ ${formatMoney(r.alumbradoClienteCents)}`} />}
            {r.aseoClienteCents > 0 && <Fila etiqueta="Aseo" valor={`+ ${formatMoney(r.aseoClienteCents)}`} />}
          </div>
          <div className="mt-3 border-t border-sky-200 pt-3">
            <div className="text-xs text-slate-500">Total a cobrar</div>
            <div className="font-display text-3xl font-bold text-sky-800">{formatMoney(r.totalCents)}</div>
          </div>
          <BotonGuardar className="mt-4 w-full rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
            Guardar liquidación
          </BotonGuardar>
        </div>
      </div>
    </form>
  );
}

function Fila({ etiqueta, valor, rojo }: { etiqueta: string; valor: string; rojo?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-600">{etiqueta}</span>
      <span className={`font-medium tabular-nums ${rojo ? "text-red-600" : "text-slate-800"}`}>{valor}</span>
    </div>
  );
}
