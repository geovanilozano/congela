import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { crearInversion, eliminarInversion, actualizarInversion } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { fechaParaInput } from "@/lib/fechas";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function InversionPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const sp = await searchParams;
  const enEdicion = sp.editar ? await db.inversion.findUnique({ where: { id: Number(sp.editar) } }) : null;
  const items = await db.inversion.findMany({ orderBy: { fecha: "desc" } });
  const total = items.reduce((a, i) => a + i.valorCents, 0);
  const totalCredito = items.filter((i) => i.formaPago === "credito").reduce((a, i) => a + i.valorCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏗️ Inversión inicial</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra todo lo que compraste para montar el negocio: paneles, inversores,
          cubeteros, refrigeradores, picadora, medidores, instalación, etc.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total invertido</div>
          <div className="mt-0.5 text-xl font-bold text-slate-800">{formatMoney(total)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Comprado a crédito</div>
          <div className="mt-0.5 text-xl font-bold text-amber-600">{formatMoney(totalCredito)}</div>
        </div>
      </div>

      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarInversion : crearInversion}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Descripción</span>
          <input name="descripcion" required placeholder="Ej: Refrigerador 400L" defaultValue={enEdicion?.descripcion} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Proveedor</span>
          <input name="proveedor" defaultValue={enEdicion?.proveedor ?? undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Valor ($)</span>
          <input name="valorPesos" type="number" min="0" required defaultValue={enEdicion ? enEdicion.valorCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Forma de pago</span>
          <select name="formaPago" defaultValue={enEdicion?.formaPago ?? "credito"} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="credito">Crédito</option>
            <option value="contado">Contado</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha</span>
          <input name="fecha" type="date" defaultValue={fechaParaInput(enEdicion?.fecha) || undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        {enEdicion ? (
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
            <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
              Guardar cambios
            </BotonGuardar>
            <a href="?" className="text-sm text-slate-500 hover:underline">Cancelar</a>
          </div>
        ) : (
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-5">
            Agregar a la inversión
          </BotonGuardar>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Descripción</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Pago</th>
              <th className="text-right">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-slate-400">Sin registros aún.</td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-3 font-medium text-slate-700">
                  {i.descripcion}
                  {i.activoId && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">🧰 equipo</span>
                  )}
                </td>
                <td className="text-slate-500">{i.proveedor || "—"}</td>
                <td className="text-slate-500">{fmtFecha(i.fecha)}</td>
                <td>
                  <span className={i.formaPago === "credito" ? "text-amber-600" : "text-emerald-600"}>
                    {i.formaPago}
                  </span>
                </td>
                <td className="text-right font-medium">{formatMoney(i.valorCents)}</td>
                <td className="pr-3 text-right">
                  {i.activoId ? (
                    <span className="text-xs text-slate-400">se edita en Activos</span>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <a href={`?editar=${i.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                      <BotonEliminar action={eliminarInversion} id={i.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
