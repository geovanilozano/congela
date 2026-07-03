import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { crearActivo, eliminarActivo } from "./actions";

export const dynamic = "force-dynamic";

const TIPOS = ["cubetero", "refrigerador", "panel", "inversor", "medidor", "picadora", "otro"];
const ESTADOS = ["activo", "mantenimiento", "dañado", "baja"];

const estadoColor: Record<string, string> = {
  activo: "text-emerald-600",
  mantenimiento: "text-amber-600",
  dañado: "text-red-600",
  baja: "text-slate-400",
};

function fmtFecha(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function ActivosPage() {
  const activos = await db.activo.findMany({ orderBy: { id: "desc" } });
  const totalCosto = activos.reduce((a, x) => a + x.costoCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧰 Activos y equipos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cubeteros, refrigeradores, paneles, inversor, medidores y picadora: marca, capacidad,
          consumo, garantía y estado.
        </p>
      </div>

      <div className="w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">Valor total de equipos</div>
        <div className="mt-0.5 text-xl font-bold text-slate-800">{formatMoney(totalCosto)}</div>
      </div>

      <form action={crearActivo} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-slate-500">Nombre</span>
          <input name="nombre" required placeholder="Refrigerador #1" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Tipo</span>
          <select name="tipo" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Marca</span>
          <input name="marca" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Capacidad</span>
          <input name="capacidad" placeholder="400 L / 50 kg" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Consumo (kWh)</span>
          <input name="consumoKwh" type="number" min="0" step="0.1" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Costo ($)</span>
          <input name="costoPesos" type="number" min="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha de compra</span>
          <input name="fechaCompra" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Garantía hasta</span>
          <input name="garantiaHasta" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Estado</span>
          <select name="estado" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Ubicación</span>
          <input name="ubicacion" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-4">
          Agregar equipo
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Equipo</th>
              <th>Marca</th>
              <th>Capacidad</th>
              <th>Consumo</th>
              <th>Garantía</th>
              <th>Estado</th>
              <th className="text-right">Costo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {activos.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-400">Sin equipos aún.</td></tr>}
            {activos.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="p-3 font-medium text-slate-700">{a.nombre}<div className="text-xs text-slate-400">{a.tipo}</div></td>
                <td className="text-slate-500">{a.marca || "—"}</td>
                <td className="text-slate-500">{a.capacidad || "—"}</td>
                <td className="text-slate-500">{a.consumoKwh ? `${a.consumoKwh} kWh` : "—"}</td>
                <td className="text-slate-500">{fmtFecha(a.garantiaHasta)}</td>
                <td className={estadoColor[a.estado] ?? "text-slate-600"}>{a.estado}</td>
                <td className="text-right font-medium">{formatMoney(a.costoCents)}</td>
                <td className="pr-3 text-right">
                  <form action={eliminarActivo} className="inline">
                    <input type="hidden" name="id" value={a.id} />
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
