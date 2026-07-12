import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { estadoMantenimiento, EstadoMantenimiento } from "@/lib/mantenimiento";
import { crearMantenimiento, actualizarMantenimiento, marcarRealizado, eliminarMantenimiento } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { FiltroFecha } from "@/components/FiltroFecha";
import { rangoFechas } from "@/lib/fechas";

export const dynamic = "force-dynamic";

const badge: Record<EstadoMantenimiento, { label: string; cls: string }> = {
  realizado: { label: "Realizado", cls: "bg-emerald-100 text-emerald-700" },
  vencido: { label: "Vencido", cls: "bg-red-100 text-red-700" },
  proximo: { label: "Próximo", cls: "bg-amber-100 text-amber-700" },
  programado: { label: "Programado", cls: "bg-slate-100 text-slate-600" },
};

function fmtFecha(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

function fmtFechaInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function MantenimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const [mantenimientos, activos, enEdicion] = await Promise.all([
    db.mantenimiento.findMany({
      where: { fechaProgramada: rangoFechas(sp) },
      include: { activo: true },
      orderBy: { fechaProgramada: "asc" },
    }),
    db.activo.findMany({ orderBy: { nombre: "asc" } }),
    sp.editar ? db.mantenimiento.findUnique({ where: { id: Number(sp.editar) } }) : null,
  ]);

  const hoy = new Date();
  const conEstado = mantenimientos.map((m) => ({ ...m, est: estadoMantenimiento(m, hoy) }));
  const alertas = conEstado.filter((m) => m.est === "vencido" || m.est === "proximo");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🛠️ Mantenimiento</h1>
        <p className="mt-1 text-sm text-slate-500">
          Programa mantenimientos preventivos y correctivos de cubeteros, refrigeradores,
          picadora, paneles y medidores. Al marcarlo realizado, su costo se registra como gasto.
        </p>
      </div>

      {alertas.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          🔔 <b>Atención:</b> {alertas.map((m) => `${m.descripcion} (${badge[m.est].label.toLowerCase()})`).join(", ")}
        </div>
      )}

      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarMantenimiento : crearMantenimiento}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Descripción</span>
          <input name="descripcion" required placeholder="Limpieza de condensador" defaultValue={enEdicion?.descripcion} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Tipo</span>
          <select name="tipo" defaultValue={enEdicion?.tipo ?? "preventivo"} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="preventivo">Preventivo</option>
            <option value="correctivo">Correctivo</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Equipo</span>
          <select name="activoId" defaultValue={enEdicion?.activoId ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="">—</option>
            {activos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha programada</span>
          <input name="fechaProgramada" type="date" required defaultValue={fmtFechaInput(enEdicion?.fechaProgramada ?? null)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Costo estimado ($)</span>
          <input name="costoPesos" type="number" min="0" defaultValue={enEdicion ? enEdicion.costoCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Nota</span>
          <input name="nota" defaultValue={enEdicion?.nota ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Programar mantenimiento"}
          </BotonGuardar>
          {enEdicion && (
            <a href="?" className="text-sm text-slate-500 hover:underline">Cancelar</a>
          )}
        </div>
      </form>

      <FiltroFecha desde={sp.desde} hasta={sp.hasta} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Descripción</th>
              <th>Equipo</th>
              <th>Tipo</th>
              <th>Programado</th>
              <th className="text-right">Costo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {conEstado.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-400">Sin mantenimientos aún.</td></tr>}
            {conEstado.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="p-3 font-medium text-slate-700">{m.descripcion}</td>
                <td className="text-slate-500">{m.activo?.nombre || "—"}</td>
                <td className="text-slate-600">{m.tipo}</td>
                <td className="text-slate-500">{fmtFecha(m.fechaProgramada)}</td>
                <td className="text-right">{formatMoney(m.costoCents)}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[m.est].cls}`}>{badge[m.est].label}</span>
                </td>
                <td className="pr-3 text-right">
                  {m.estado !== "realizado" && (
                    <form action={marcarRealizado} className="mb-1 inline">
                      <input type="hidden" name="id" value={m.id} />
                      <BotonGuardar className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">Marcar realizado</BotonGuardar>
                    </form>
                  )}
                  <div className="flex items-center justify-end gap-3">
                    {m.estado !== "realizado" && (
                      <a href={`?editar=${m.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                    )}
                    <BotonEliminar action={eliminarMantenimiento} id={m.id} />
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
