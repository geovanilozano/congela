import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/finance/money";
import { BotonImprimir } from "@/components/BotonImprimir";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

export default async function FacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venta = await db.venta.findUnique({
    where: { id: Number(id) },
    include: { cliente: true, items: true },
  });
  if (!venta) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Controles (no salen en el PDF) */}
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/ventas" className="text-sm text-slate-500 hover:underline">← Volver a ventas</Link>
        <BotonImprimir className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700" />
      </div>

      {/* Factura */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 font-display text-2xl font-bold text-slate-800">
              <span>🧊</span> Congela
            </div>
            <div className="text-sm text-slate-500">Producción y venta de hielo</div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-bold text-slate-800">Factura N° {venta.id}</div>
            <div className="text-sm text-slate-500">{fmtFecha(venta.fecha)}</div>
          </div>
        </div>

        <div className="mt-5 text-sm">
          <span className="text-slate-500">Cliente: </span>
          <span className="font-medium text-slate-800">{venta.cliente?.nombre ?? "Consumidor final"}</span>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Descripción</th>
              <th className="py-2 text-right">Cantidad</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{it.descripcion}</td>
                <td className="py-2 text-right text-slate-600">{it.cantidad}</td>
                <td className="py-2 text-right text-slate-600">{formatMoney(it.precioUnitCents)}</td>
                <td className="py-2 text-right font-medium text-slate-800">{formatMoney(it.subtotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm capitalize text-slate-500">Forma de pago: {venta.formaPago}</span>
          <div className="text-right">
            <div className="text-xs text-slate-500">Total</div>
            <div className="font-display text-2xl font-bold text-slate-900">{formatMoney(venta.totalCents)}</div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">¡Gracias por su compra!</p>
      </div>
    </div>
  );
}
