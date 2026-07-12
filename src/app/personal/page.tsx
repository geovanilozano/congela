import { db } from "@/lib/db";
import { formatMoney, fromCents } from "@/lib/finance/money";
import { crearEmpleado, registrarAsistencia, registrarPago, eliminarEmpleado, actualizarEmpleado } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";

export const dynamic = "force-dynamic";

const estadoColor: Record<string, string> = {
  presente: "text-emerald-600",
  tarde: "text-amber-600",
  ausente: "text-red-600",
};

export default async function PersonalPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const sp = await searchParams;
  const empleados = await db.empleado.findMany({
    include: {
      asistencias: { orderBy: { fecha: "desc" }, take: 5 },
      pagos: true,
      producciones: true,
    },
    orderBy: { nombre: "asc" },
  });

  const enEdicion = sp.editar ? await db.empleado.findUnique({ where: { id: Number(sp.editar) } }) : null;

  const totalNomina = empleados.reduce((a, e) => a + e.pagos.reduce((s, p) => s + p.valorCents, 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">👷 Personal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trabajadores, asistencia, pagos y producción de cada uno.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Empleados</div>
          <div className="mt-0.5 text-xl font-bold text-slate-800">{empleados.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total pagado (nómina)</div>
          <div className="mt-0.5 text-xl font-bold text-sky-700">{formatMoney(totalNomina)}</div>
        </div>
      </div>

      {/* Nuevo empleado / edición */}
      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarEmpleado : crearEmpleado}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm">
          <span className="text-slate-500">Nombre</span>
          <input name="nombre" required defaultValue={enEdicion?.nombre ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cargo</span>
          <input name="cargo" placeholder="Operario / Vendedor" defaultValue={enEdicion?.cargo ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Teléfono</span>
          <input name="telefono" defaultValue={enEdicion?.telefono ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Salario ($)</span>
          <input
            name="salarioPesos"
            type="number"
            min="0"
            defaultValue={enEdicion ? fromCents(enEdicion.salarioCents) : undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha de ingreso</span>
          <input
            name="fechaIngreso"
            type="date"
            defaultValue={enEdicion?.fechaIngreso ? new Date(enEdicion.fechaIngreso).toISOString().slice(0, 10) : undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Agregar empleado"}
          </BotonGuardar>
          {enEdicion && (
            <a href="?" className="text-sm text-slate-500 hover:underline">
              Cancelar
            </a>
          )}
        </div>
      </form>

      {/* Tarjetas de empleados */}
      <div className="grid gap-4 lg:grid-cols-2">
        {empleados.length === 0 && <p className="text-sm text-slate-400">Sin empleados aún.</p>}
        {empleados.map((e) => {
          const totalPagado = e.pagos.reduce((s, p) => s + p.valorCents, 0);
          const bolsas = e.producciones.reduce((s, p) => s + p.bolsas, 0);
          return (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">{e.nombre}</h2>
                  <p className="text-xs text-slate-500">{e.cargo || "—"} · {e.telefono || "sin teléfono"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`?editar=${e.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                  <BotonEliminar action={eliminarEmpleado} id={e.id} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">Salario</div>
                  <div className="font-semibold text-slate-800">{formatMoney(e.salarioCents)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">Pagado</div>
                  <div className="font-semibold text-sky-700">{formatMoney(totalPagado)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">Bolsas</div>
                  <div className="font-semibold text-emerald-600">{bolsas}</div>
                </div>
              </div>

              {/* Asistencia rápida */}
              <form action={registrarAsistencia} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="empleadoId" value={e.id} />
                <input type="hidden" name="turno" value="" />
                <select name="estado" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="presente">Presente</option>
                  <option value="tarde">Tarde</option>
                  <option value="ausente">Ausente</option>
                </select>
                <input name="fecha" type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Marcar asistencia</BotonGuardar>
              </form>

              {/* Pago rápido */}
              <form action={registrarPago} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="empleadoId" value={e.id} />
                <input name="valorPesos" type="number" min="0" placeholder="Valor $" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <input name="concepto" defaultValue="Salario" className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <BotonGuardar className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">Registrar pago</BotonGuardar>
              </form>

              {/* Últimas asistencias */}
              {e.asistencias.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {e.asistencias.map((a) => (
                    <span key={a.id} className={`rounded-full bg-slate-100 px-2 py-0.5 ${estadoColor[a.estado] ?? ""}`}>
                      {new Date(a.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}: {a.estado}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
