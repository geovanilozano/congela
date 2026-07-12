import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { crearCompra, eliminarCompra, actualizarCompra } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { FiltroFecha } from "@/components/FiltroFecha";
import { rangoFechas } from "@/lib/fechas";

export const dynamic = "force-dynamic";

const CATEGORIAS = ["bolsas", "mantenimiento", "nomina", "transporte", "arriendo", "servicios", "reparaciones", "impuestos", "otro"];

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

function fmtFechaInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const enEdicion = sp.editar ? await db.compraGasto.findUnique({ where: { id: Number(sp.editar) } }) : null;
  const gastos = await db.compraGasto.findMany({ where: { fecha: rangoFechas(sp) }, orderBy: { fecha: "desc" } });
  const total = gastos.reduce((a, g) => a + g.valorCents, 0);

  const porCategoria = CATEGORIAS.map((c) => ({
    categoria: c,
    total: gastos.filter((g) => g.categoria === c).reduce((a, g) => a + g.valorCents, 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">💸 Compras y gastos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra egresos: bolsas, mantenimiento, nómina, transporte, arriendo, servicios,
          impuestos y demás. Puedes adjuntar foto del comprobante.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div className="text-xs text-sky-600">Total gastos</div>
          <div className="mt-0.5 text-xl font-bold text-sky-700">{formatMoney(total)}</div>
        </div>
        {porCategoria.map((c) => (
          <div key={c.categoria} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs capitalize text-slate-500">{c.categoria}</div>
            <div className="mt-0.5 text-lg font-semibold text-slate-800">{formatMoney(c.total)}</div>
          </div>
        ))}
      </div>

      <FiltroFecha desde={sp.desde} hasta={sp.hasta} />

      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarCompra : crearCompra}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm">
          <span className="text-slate-500">Categoría</span>
          <select name="categoria" defaultValue={enEdicion?.categoria} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 capitalize">
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Descripción</span>
          <input name="descripcion" required defaultValue={enEdicion?.descripcion} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Proveedor</span>
          <input name="proveedor" defaultValue={enEdicion?.proveedor ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Valor ($)</span>
          <input name="valorPesos" type="number" min="0" required defaultValue={enEdicion ? enEdicion.valorCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha</span>
          <input name="fecha" type="date" defaultValue={enEdicion ? fmtFechaInput(enEdicion.fecha) : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Foto del comprobante</span>
          <input name="foto" type="file" accept="image/*" capture="environment" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" />
        </label>
        <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-5">
          {enEdicion ? "Guardar cambios" : "Registrar gasto"}
        </button>
        {enEdicion && (
          <a href="?" className="text-center text-sm text-slate-500 hover:underline sm:col-span-2 lg:col-span-5">
            Cancelar
          </a>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Fecha</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Proveedor</th>
              <th className="text-right">Valor</th>
              <th>Comprobante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-400">Sin gastos aún.</td></tr>}
            {gastos.map((g) => (
              <tr key={g.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500">{fmtFecha(g.fecha)}</td>
                <td className="capitalize text-slate-600">{g.categoria}</td>
                <td className="font-medium text-slate-700">{g.descripcion}</td>
                <td className="text-slate-500">{g.proveedor || "—"}</td>
                <td className="text-right font-medium">{formatMoney(g.valorCents)}</td>
                <td>
                  {g.fotoUrl ? (
                    <a href={g.fotoUrl} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">Ver</a>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="pr-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a href={`?editar=${g.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                    <BotonEliminar action={eliminarCompra} id={g.id} />
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
