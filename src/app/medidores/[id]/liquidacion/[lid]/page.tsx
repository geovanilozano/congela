import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { liquidarMedidor } from "@/lib/finance/medidor";
import { getAjuste } from "@/lib/ajustes";
import { exigirLecturaPagina } from "@/lib/auth/guard";
import { BotonImprimir } from "@/components/BotonImprimir";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

export default async function FacturaMedidorPage({ params }: { params: Promise<{ id: string; lid: string }> }) {
  await exigirLecturaPagina("/medidores"); // defensa en profundidad: liquidación/PII del cliente
  const { lid } = await params;
  const [liq, negNombre, negNit, negDir, negTel] = await Promise.all([
    db.liquidacionMedidor.findUnique({
      where: { id: Number(lid) },
      include: { medidor: { include: { cliente: true } } },
    }),
    getAjuste("negocioNombre"),
    getAjuste("negocioNit"),
    getAjuste("negocioDireccion"),
    getAjuste("negocioTelefono"),
  ]);
  if (!liq) notFound();
  const id = liq.medidorId;

  const r = liquidarMedidor(liq);
  const nombreNegocio = negNombre?.trim() || "Congela";
  const cli = liq.medidor.cliente;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/medidores/${id}`} className="text-sm text-slate-500 hover:underline">← Volver al medidor</Link>
        <BotonImprimir className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 font-display text-2xl font-bold text-slate-800">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8" priority /> {nombreNegocio}
            </div>
            <div className="text-sm text-slate-500">Cobro de energía por medidor</div>
            {(negNit || negDir || negTel) && (
              <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                {negNit && <div>NIT/C.C.: {negNit}</div>}
                {negDir && <div>{negDir}</div>}
                {negTel && <div>Tel: {negTel}</div>}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-bold text-slate-800">Liquidación N° {liq.id}</div>
            <div className="text-sm text-slate-500">{fmtFecha(liq.fechaActual)}</div>
          </div>
        </div>

        {/* Cliente y medidor */}
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Cliente: </span>
            <span className="font-medium text-slate-800">{cli?.nombre ?? "—"}</span>
            {cli?.cedula && <div className="text-xs text-slate-500">C.C./NIT: {cli.cedula}</div>}
            {cli?.telefono && <div className="text-xs text-slate-500">Tel: {cli.telefono}</div>}
          </div>
          <div className="sm:text-right">
            <span className="text-slate-500">Medidor: </span>
            <span className="font-medium text-slate-800">{liq.medidor.numero}</span>
            {liq.medidor.direccion && <div className="text-xs text-slate-500">{liq.medidor.direccion}</div>}
          </div>
        </div>

        {/* Periodo y lecturas */}
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-slate-500">Periodo</span>
            <span className="font-medium text-slate-700">{fmtFecha(liq.fechaAnterior)} → {fmtFecha(liq.fechaActual)}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-slate-500">Lectura anterior</div>
              <div className="font-semibold text-slate-800">{liq.lecturaAnterior}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Lectura actual</div>
              <div className="font-semibold text-slate-800">{liq.lecturaActual}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Consumo</div>
              <div className="font-semibold text-sky-700">{r.consumoKwh} kWh</div>
            </div>
          </div>
        </div>

        {/* Desglose del cobro */}
        <table className="mt-5 w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-700">Consumo de energía</td>
              <td className="py-2 text-right text-slate-500">{r.consumoKwh} kWh × {formatMoney(liq.tarifaCuCents)}/kWh</td>
              <td className="py-2 text-right font-medium text-slate-800">{formatMoney(r.energiaCents)}</td>
            </tr>
            {r.subsidioCents > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">Descuento (subsidio)</td>
                <td className="py-2 text-right text-slate-500">
                  {liq.subsidioPct}%
                  {liq.consumoTotalKwh > 0
                    ? ` · tu parte del recibo (${liq.consumoTotalKwh} kWh)`
                    : ` sobre ${r.kwhSubsidiado} de ${r.consumoKwh} kWh`}
                  {r.energiaCents > 0 && ` · ${Math.round((r.subsidioCents / r.energiaCents) * 100)}% real`}
                </td>
                <td className="py-2 text-right font-medium text-red-600">− {formatMoney(r.subsidioCents)}</td>
              </tr>
            )}
            {r.alumbradoClienteCents > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">Alumbrado público</td>
                <td className="py-2 text-right text-slate-500">{liq.alumbradoPct}% de {formatMoney(liq.alumbradoTotalCents)}</td>
                <td className="py-2 text-right font-medium text-slate-800">{formatMoney(r.alumbradoClienteCents)}</td>
              </tr>
            )}
            {r.aseoClienteCents > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">Aseo</td>
                <td className="py-2 text-right text-slate-500">{liq.aseoPct}% de {formatMoney(liq.aseoTotalCents)}</td>
                <td className="py-2 text-right font-medium text-slate-800">{formatMoney(r.aseoClienteCents)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className={`text-sm font-medium ${liq.pagada ? "text-emerald-600" : "text-amber-600"}`}>
            {liq.pagada ? "✓ Pagada" : "Pendiente de pago"}
          </span>
          <div className="text-right">
            <div className="text-xs text-slate-500">Total a pagar</div>
            <div className="font-display text-3xl font-bold text-slate-900">{formatMoney(r.totalCents)}</div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Cobro de energía por consumo del medidor {liq.medidor.numero}.
        </p>
      </div>
    </div>
  );
}
