import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { crearVenta, eliminarVenta } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { FiltroFecha } from "@/components/FiltroFecha";
import { rangoFechas } from "@/lib/fechas";

export const dynamic = "force-dynamic";

function fmtFechaHora(d: Date) {
  return new Date(d).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const ventas = await db.venta.findMany({
    where: { cierreId: null, fecha: rangoFechas(sp) },
    include: { cliente: true, items: true },
    orderBy: { id: "desc" },
  });
  const totalPendiente = ventas.reduce((a, v) => a + v.totalCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧾 Ventas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra cada venta de hielo. Al final del día, en <b>Cierre de caja</b>, el total
          se reparte automáticamente en los fondos (arriendo, crédito, reserva, utilidad).
        </p>
      </div>

      <form
        action={crearVenta}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Producto</span>
          <input name="descripcion" defaultValue="Bolsa de hielo" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cantidad</span>
          <input name="cantidad" type="number" min="1" defaultValue={1} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Precio unitario ($)</span>
          <input name="precioPesos" type="number" min="0" required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cliente (opcional)</span>
          <input name="clienteNombre" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Forma de pago</span>
          <select name="formaPago" defaultValue="contado" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
          </select>
        </label>
        <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-6">
          Registrar venta
        </button>
      </form>

      <div className="flex items-center justify-between rounded-xl bg-sky-600 px-5 py-3 text-white">
        <span className="text-sm">Ventas sin cerrar (pendientes de cierre de caja)</span>
        <span className="text-lg font-bold">{formatMoney(totalPendiente)}</span>
      </div>

      <FiltroFecha desde={sp.desde} hasta={sp.hasta} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-3">Fecha</th>
              <th>Producto</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-slate-400">No hay ventas pendientes.</td></tr>
            )}
            {ventas.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500">{fmtFechaHora(v.fecha)}</td>
                <td className="font-medium text-slate-700">
                  {v.items.map((it) => `${it.cantidad}× ${it.descripcion}`).join(", ")}
                </td>
                <td className="text-slate-500">{v.cliente?.nombre || "—"}</td>
                <td className={v.formaPago === "credito" ? "text-amber-600" : "text-emerald-600"}>{v.formaPago}</td>
                <td className="text-right font-medium">{formatMoney(v.totalCents)}</td>
                <td className="pr-3 text-right">
                  <BotonEliminar action={eliminarVenta} id={v.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
