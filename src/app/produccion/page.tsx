import { db } from "@/lib/db";
import { crearProduccion, eliminarProduccion } from "./actions";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ProduccionPage() {
  const [registros, activos, empleados] = await Promise.all([
    db.produccion.findMany({ include: { activo: true, empleado: true }, orderBy: { fecha: "desc" } }),
    db.activo.findMany({ where: { tipo: "cubetero" }, orderBy: { nombre: "asc" } }),
    db.empleado.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const totalBolsas = registros.reduce((a, r) => a + r.bolsas, 0);
  const totalPerdidas = registros.reduce((a, r) => a + r.perdidas, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏭 Producción de hielo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra cuánto hielo produces por día, turno y cubetero: bolsas, tipo (cubo/picado) y
          pérdidas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Bolsas producidas</div>
          <div className="mt-0.5 text-xl font-bold text-sky-700">{totalBolsas}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Pérdidas / merma</div>
          <div className="mt-0.5 text-xl font-bold text-red-600">{totalPerdidas}</div>
        </div>
      </div>

      <form action={crearProduccion} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-slate-500">Fecha</span>
          <input name="fecha" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Turno</span>
          <select name="turno" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="">—</option>
            <option value="mañana">Mañana</option>
            <option value="tarde">Tarde</option>
            <option value="noche">Noche</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Tipo</span>
          <select name="tipo" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="cubo">Cubo</option>
            <option value="picado">Picado</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cubetero</span>
          <select name="activoId" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="">—</option>
            {activos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Empleado</span>
          <select name="empleadoId" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="">—</option>
            {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Bolsas producidas</span>
          <input name="bolsas" type="number" min="0" required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Kilos (opcional)</span>
          <input name="kilos" type="number" min="0" step="0.1" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Pérdidas (bolsas)</span>
          <input name="perdidas" type="number" min="0" defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Nota</span>
          <input name="nota" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-4">
          Registrar producción
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Fecha</th>
              <th>Turno</th>
              <th>Tipo</th>
              <th>Cubetero</th>
              <th>Empleado</th>
              <th className="text-right">Bolsas</th>
              <th className="text-right">Pérdidas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-400">Sin producción registrada.</td></tr>}
            {registros.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500">{fmtFecha(r.fecha)}</td>
                <td className="text-slate-500">{r.turno || "—"}</td>
                <td className="text-slate-600">{r.tipo}</td>
                <td className="text-slate-500">{r.activo?.nombre || "—"}</td>
                <td className="text-slate-500">{r.empleado?.nombre || "—"}</td>
                <td className="text-right font-medium text-sky-700">{r.bolsas}</td>
                <td className="text-right text-red-600">{r.perdidas || 0}</td>
                <td className="pr-3 text-right">
                  <form action={eliminarProduccion} className="inline">
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
