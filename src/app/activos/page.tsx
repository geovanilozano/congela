import { db } from "@/lib/db";
import { formatMoney, fromCents } from "@/lib/finance/money";
import { crearActivo, actualizarActivo, eliminarActivo } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { InputDinero } from "@/components/InputDinero";
import { fechaParaInput } from "@/lib/fechas";

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

function fmtFechaInput(d: Date | null) {
  return fechaParaInput(d);
}

export default async function ActivosPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; buscar?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.buscar ?? "").trim();

  // Filtro de búsqueda por nombre o marca.
  const filtro = q
    ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" as const } },
          { marca: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [activos, resumen, porEstado, enEdicion] = await Promise.all([
    db.activo.findMany({ where: filtro, orderBy: { id: "desc" } }),
    // Resumen de TODO el negocio (no depende del filtro de búsqueda).
    db.activo.aggregate({ _sum: { costoCents: true }, _count: { _all: true } }),
    db.activo.groupBy({ by: ["estado"], _count: { _all: true } }),
    sp.editar
      ? db.activo.findUnique({ where: { id: Number(sp.editar) }, include: { inversion: true } })
      : Promise.resolve(null),
  ]);

  const totalInvertido = resumen._sum.costoCents ?? 0;
  const numEquipos = resumen._count._all;
  const conteoEstado = (estado: string) =>
    porEstado.find((g) => g.estado === estado)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧰 Activos y equipos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cubeteros, refrigeradores, paneles, inversor, medidores y picadora: marca, capacidad,
          consumo, garantía y estado. Si le pones <b>costo</b>, el equipo se suma
          automáticamente a la <b>inversión</b> (no hay que registrarlo dos veces).
        </p>
      </div>

      {/* Resumen del negocio completo (independiente del filtro de búsqueda). */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total invertido en equipos</div>
          <div className="mt-0.5 text-xl font-bold text-slate-800">{formatMoney(totalInvertido)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Número de equipos</div>
          <div className="mt-0.5 text-xl font-bold text-slate-800">{numEquipos}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Equipos por estado</div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {ESTADOS.map((e) => (
              <span key={e} className="flex items-baseline gap-1">
                <span className={`font-bold ${estadoColor[e] ?? "text-slate-600"}`}>{conteoEstado(e)}</span>
                <span className="text-xs text-slate-500">{e}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarActivo : crearActivo}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm">
          <span className="text-slate-500">Nombre</span>
          <input name="nombre" required placeholder="Refrigerador #1" defaultValue={enEdicion?.nombre} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Tipo</span>
          <select name="tipo" defaultValue={enEdicion?.tipo ?? TIPOS[0]} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Marca</span>
          <input name="marca" defaultValue={enEdicion?.marca ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Proveedor</span>
          <input name="proveedor" defaultValue={enEdicion?.inversion?.proveedor ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Capacidad</span>
          <input name="capacidad" placeholder="400 L / 50 kg" defaultValue={enEdicion?.capacidad ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Consumo (kWh)</span>
          <input name="consumoKwh" type="number" min="0" step="0.1" defaultValue={enEdicion?.consumoKwh ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Costo ($)</span>
          <InputDinero name="costoPesos" defaultValue={enEdicion ? fromCents(enEdicion.costoCents) : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Forma de pago</span>
          <select name="formaPago" defaultValue={enEdicion?.inversion?.formaPago ?? "credito"} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="credito">Crédito</option>
            <option value="contado">Contado</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha de compra</span>
          <input name="fechaCompra" type="date" defaultValue={fmtFechaInput(enEdicion?.fechaCompra ?? null)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Garantía hasta</span>
          <input name="garantiaHasta" type="date" defaultValue={fmtFechaInput(enEdicion?.garantiaHasta ?? null)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Estado</span>
          <select name="estado" defaultValue={enEdicion?.estado ?? ESTADOS[0]} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Ubicación</span>
          <input name="ubicacion" defaultValue={enEdicion?.ubicacion ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Agregar equipo"}
          </BotonGuardar>
          {enEdicion && (
            <a href="?" className="text-sm text-slate-500 hover:underline">
              Cancelar
            </a>
          )}
        </div>
      </form>

      {/* Búsqueda de equipos por nombre o marca */}
      <form className="flex flex-wrap gap-2">
        <input
          name="buscar"
          defaultValue={q}
          placeholder="Buscar por nombre o marca…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Buscar</button>
        {q && (
          <a href="/activos" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Limpiar
          </a>
        )}
      </form>

      {q && (
        <p className="text-sm text-slate-500">
          {activos.length === 0
            ? `No se encontraron equipos para "${q}".`
            : `${activos.length} resultado${activos.length === 1 ? "" : "s"} para "${q}".`}
        </p>
      )}

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
            {activos.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-400">{q ? "No hay equipos que coincidan con la búsqueda." : "Sin equipos aún."}</td></tr>}
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
                  <div className="flex items-center justify-end gap-3">
                    <a href={`?editar=${a.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                    <BotonEliminar action={eliminarActivo} id={a.id} />
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
