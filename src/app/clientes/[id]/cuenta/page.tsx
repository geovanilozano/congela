import Image from "next/image";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/finance/money";
import { getAjuste } from "@/lib/ajustes";
import { BotonImprimir } from "@/components/BotonImprimir";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function CuentaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clienteId = Number(id);
  const [cliente, ventas, negNombre] = await Promise.all([
    db.cliente.findUnique({ where: { id: clienteId } }),
    db.venta.findMany({ where: { clienteId }, include: { items: true }, orderBy: { fecha: "desc" } }),
    getAjuste("negocioNombre"),
  ]);
  if (!cliente) notFound();

  const nombreNegocio = negNombre?.trim() || "Congela";
  const totalComprado = ventas.reduce((a, v) => a + v.totalCents, 0);
  const saldoPendiente = ventas
    .filter((v) => v.formaPago === "credito" && !v.pagada)
    .reduce((a, v) => a + v.totalCents, 0);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Controles (no salen en el PDF) */}
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/clientes" className="text-sm text-slate-500 hover:underline">← Volver a clientes</Link>
        <BotonImprimir className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 font-display text-2xl font-bold text-slate-800">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8" priority /> {nombreNegocio}
            </div>
            <div className="text-sm text-slate-500">Estado de cuenta</div>
          </div>
          <div className="text-right text-sm text-slate-500">{fmtFecha(new Date())}</div>
        </div>

        <div className="mt-5 text-sm">
          <div>
            <span className="text-slate-500">Cliente: </span>
            <span className="font-medium text-slate-800">{cliente.nombre}</span>
          </div>
          {(cliente.cedula || cliente.telefono) && (
            <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-500">
              {cliente.cedula && <span>C.C./NIT: {cliente.cedula}</span>}
              {cliente.telefono && <span>Tel: {cliente.telefono}</span>}
            </div>
          )}
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Fecha</th>
              <th className="py-2">Detalle</th>
              <th className="py-2">Pago</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Este cliente no tiene compras registradas.
                </td>
              </tr>
            )}
            {ventas.map((v) => {
              const pendiente = v.formaPago === "credito" && !v.pagada;
              return (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-600">{fmtFecha(v.fecha)}</td>
                  <td className="py-2 text-slate-700">
                    {v.items.map((it) => `${it.cantidad}× ${it.descripcion}`).join(", ")}
                  </td>
                  <td className="py-2">
                    {pendiente ? (
                      <span className="text-amber-600">fiado (pendiente)</span>
                    ) : (
                      <span className="text-emerald-600">{v.formaPago === "credito" ? "fiado pagado" : "contado"}</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-800">{formatMoney(v.totalCents)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Total comprado</span>
            <span className="font-medium">{formatMoney(totalComprado)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Saldo pendiente (fiado sin pagar)</span>
            <span className={`font-display text-xl font-bold ${saldoPendiente > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatMoney(saldoPendiente)}
            </span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">Gracias por tu confianza. 🧊</p>
      </div>
    </div>
  );
}
