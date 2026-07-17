import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { crearVenta, actualizarVenta, eliminarVenta } from "./actions";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { FiltroFecha } from "@/components/FiltroFecha";
import { rangoFechas, fechaParaInput } from "@/lib/fechas";
import { InputDinero } from "@/components/InputDinero";

export const dynamic = "force-dynamic";

function fmtFechaHora(d: Date) {
  return new Date(d).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; error?: string; ok?: string; editar?: string }>;
}) {
  const sp = await searchParams;
  const editarId = sp.editar ? Number(sp.editar) : null;

  const [ventas, clientesLista, enEdicion] = await Promise.all([
    db.venta.findMany({
      where: { cierreId: null, fecha: rangoFechas(sp) },
      include: { cliente: true, items: true },
      orderBy: { id: "desc" },
    }),
    db.cliente.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    editarId
      ? db.venta.findUnique({ where: { id: editarId }, include: { cliente: true, items: true } })
      : Promise.resolve(null),
  ]);
  const totalPendiente = ventas.reduce((a, v) => a + v.totalCents, 0);

  // Datos precargados del ítem cuando se está editando (una venta tiene un solo ítem).
  const item = enEdicion?.items[0];
  const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧾 Ventas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra cada venta de hielo. Al final del día, en <b>Cierre de caja</b>, el total
          se reparte automáticamente en los fondos (arriendo, crédito, reserva, utilidad).
        </p>
      </div>

      {sp.error === "precio" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No se guardó la venta.</strong> Falta el precio (debe ser mayor que $0).
        </div>
      )}
      {sp.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Venta guardada.
        </div>
      )}

      {enEdicion && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
          Editando la venta #{enEdicion.id}.
        </div>
      )}

      <form
        key={enEdicion?.id ?? "nueva"}
        action={enEdicion ? actualizarVenta : crearVenta}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm">
          <span className="text-slate-500">Fecha</span>
          <input
            name="fecha"
            type="date"
            defaultValue={enEdicion ? fechaParaInput(enEdicion.fecha) : undefined}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Producto</span>
          <input name="descripcion" defaultValue={item?.descripcion ?? "Bolsa de hielo"} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cantidad</span>
          <input name="cantidad" type="number" min="1" defaultValue={item?.cantidad ?? 1} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Precio unitario ($)</span>
          <InputDinero
            name="precioPesos"
            required
            defaultValue={item ? item.precioUnitCents / 100 : undefined}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cliente (opcional)</span>
          <input
            name="clienteNombre"
            list="clientes-lista"
            defaultValue={enEdicion?.cliente?.nombre ?? ""}
            placeholder="Escribe para buscar…"
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Forma de pago</span>
          <select name="formaPago" defaultValue={enEdicion?.formaPago ?? "contado"} className={inputCls}>
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
          </select>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Registrar venta"}
          </BotonGuardar>
          {enEdicion && (
            <Link href="/ventas" className="text-sm text-slate-500 hover:underline">
              Cancelar
            </Link>
          )}
        </div>
      </form>

      {/* Sugerencias de clientes registrados para el campo de arriba. */}
      <datalist id="clientes-lista">
        {clientesLista.map((c) => (
          <option key={c.id} value={c.nombre} />
        ))}
      </datalist>

      <div className="flex items-center justify-between rounded-xl bg-sky-600 px-5 py-3 text-white">
        <span className="text-sm">Ventas sin cerrar (pendientes de cierre de caja)</span>
        <span className="text-lg font-bold">{formatMoney(totalPendiente)}</span>
      </div>

      <FiltroFecha desde={sp.desde} hasta={sp.hasta} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
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
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/ventas?editar=${v.id}`} className="text-xs text-slate-600 hover:underline">Editar</Link>
                    <Link href={`/ventas/${v.id}/factura`} className="text-xs text-sky-600 hover:underline">Factura</Link>
                    <BotonEliminar action={eliminarVenta} id={v.id} />
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
