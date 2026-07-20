import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { registrarRecibo, eliminarRecibo, actualizarRecibo } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { InputDinero } from "@/components/InputDinero";
import { FiltroFecha } from "@/components/FiltroFecha";
import { rangoFechas, fechaParaInput } from "@/lib/fechas";
import { LectorFoto } from "@/components/LectorFoto";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, { label: string; icon: string }> = {
  energia: { label: "Energía", icon: "⚡" },
  agua: { label: "Agua", icon: "💧" },
  gas: { label: "Gas", icon: "🔥" },
  internet: { label: "Internet", icon: "🌐" },
};

function fmtFecha(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

function fmtFechaInput(d: Date | null) {
  return fechaParaInput(d);
}

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const enEdicion = sp.editar
    ? await db.reciboServicio.findUnique({ where: { id: Number(sp.editar) } })
    : null;

  // Rango del MES ACTUAL en hora local (nunca toISOString): del día 1 al último día.
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
  const rangoMes = { gte: inicioMes, lte: finMes };
  const nombreMes = ahora.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const [recibos, resumenMes, porTipoMes] = await Promise.all([
    db.reciboServicio.findMany({
      where: { fecha: rangoFechas(sp) },
      orderBy: { fecha: "desc" },
    }),
    db.reciboServicio.aggregate({
      where: { fecha: rangoMes },
      _sum: { valorCents: true },
    }),
    db.reciboServicio.groupBy({
      by: ["tipo"],
      where: { fecha: rangoMes },
      _sum: { valorCents: true },
    }),
  ]);

  // Resumen del mes actual: total pagado y desglose por tipo de servicio.
  const totalMes = resumenMes._sum.valorCents ?? 0;
  const sumaPorTipoMes = new Map(porTipoMes.map((g) => [g.tipo, g._sum.valorCents ?? 0]));
  const desgloseMes = Object.keys(TIPOS).map((t) => ({
    tipo: t,
    total: sumaPorTipoMes.get(t) ?? 0,
  }));

  const totalPorTipo = Object.keys(TIPOS).map((t) => ({
    tipo: t,
    total: recibos.filter((r) => r.tipo === t).reduce((a, r) => a + r.valorCents, 0),
  }));
  const totalGeneral = recibos.reduce((a, r) => a + r.valorCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔌 Servicios (recibos)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra los recibos de energía, agua, gas e internet. Puedes tomarle foto al
          recibo físico y subirla como respaldo.
        </p>
      </div>

      {/* Resumen del mes actual */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold capitalize text-slate-700">Resumen de {nombreMes}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {desgloseMes.map((t) => (
            <div key={t.tipo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">{TIPOS[t.tipo].icon} {TIPOS[t.tipo].label}</div>
              <div className="mt-1 text-lg font-bold text-slate-800">{formatMoney(t.total)}</div>
            </div>
          ))}
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="text-xs text-sky-600">Total pagado este mes</div>
            <div className="mt-1 text-lg font-bold text-sky-700">{formatMoney(totalMes)}</div>
          </div>
        </div>
      </section>

      {/* Totales por servicio (según el filtro de fechas) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {totalPorTipo.map((t) => (
          <div key={t.tipo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{TIPOS[t.tipo].icon} {TIPOS[t.tipo].label}</div>
            <div className="mt-1 text-lg font-bold text-slate-800">{formatMoney(t.total)}</div>
          </div>
        ))}
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div className="text-xs text-sky-600">Total servicios</div>
          <div className="mt-1 text-lg font-bold text-sky-700">{formatMoney(totalGeneral)}</div>
        </div>
      </div>

      {/* Formulario recibo */}
      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarRecibo : registrarRecibo}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm">
          <span className="text-slate-500">Servicio</span>
          <select name="tipo" defaultValue={enEdicion?.tipo ?? "energia"} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Valor del recibo ($)</span>
          <InputDinero
            name="valorPesos"
            required
            defaultValue={enEdicion ? enEdicion.valorCents / 100 : undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Consumo (kWh/m³)</span>
          <input
            name="consumo"
            type="number"
            min="0"
            step="0.1"
            defaultValue={enEdicion?.consumo ?? undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Desde</span>
          <input
            name="periodoInicio"
            type="date"
            defaultValue={fmtFechaInput(enEdicion?.periodoInicio ?? null)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Hasta</span>
          <input
            name="periodoFin"
            type="date"
            defaultValue={fmtFechaInput(enEdicion?.periodoFin ?? null)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        {!enEdicion && (
          <div className="text-sm sm:col-span-2">
            <LectorFoto />
          </div>
        )}
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-6">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Guardar recibo"}
          </BotonGuardar>
          {enEdicion && (
            <a href="?" className="text-sm text-slate-500 hover:underline">Cancelar</a>
          )}
        </div>
      </form>

      {/* Filtro por fecha */}
      <FiltroFecha desde={sp.desde} hasta={sp.hasta} />

      {/* Lista */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Servicio</th>
              <th>Periodo</th>
              <th>Consumo</th>
              <th className="text-right">Valor</th>
              <th>Foto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recibos.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-slate-400">Sin recibos aún.</td></tr>
            )}
            {recibos.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3 font-medium text-slate-700">
                  {TIPOS[r.tipo]?.icon} {TIPOS[r.tipo]?.label ?? r.tipo}
                </td>
                <td className="text-slate-500">{fmtFecha(r.periodoInicio)} – {fmtFecha(r.periodoFin)}</td>
                <td className="text-slate-500">{r.consumo ?? "—"}</td>
                <td className="text-right font-medium">{formatMoney(r.valorCents)}</td>
                <td>
                  {r.fotoUrl ? (
                    <a href={r.fotoUrl} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">Ver foto</a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="pr-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <a href={`?editar=${r.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                    <BotonEliminar action={eliminarRecibo} id={r.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
