import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { registrarRecibo, eliminarRecibo } from "./actions";

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

export default async function ServiciosPage() {
  const recibos = await db.reciboServicio.findMany({ orderBy: { fecha: "desc" } });

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

      {/* Totales por servicio */}
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
        action={registrarRecibo}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="text-sm">
          <span className="text-slate-500">Servicio</span>
          <select name="tipo" defaultValue="energia" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Valor del recibo ($)</span>
          <input name="valorPesos" type="number" min="0" required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Consumo (kWh/m³)</span>
          <input name="consumo" type="number" min="0" step="0.1" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Desde</span>
          <input name="periodoInicio" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Hasta</span>
          <input name="periodoFin" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Foto del recibo</span>
          <input name="foto" type="file" accept="image/*" capture="environment" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" />
        </label>
        <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-6">
          Guardar recibo
        </button>
      </form>

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
                  <form action={eliminarRecibo} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
