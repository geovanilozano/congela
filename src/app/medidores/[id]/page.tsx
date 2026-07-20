import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { liquidarMedidor } from "@/lib/finance/medidor";
import { fechaParaInput } from "@/lib/fechas";
import { FormLiquidacion } from "@/components/FormLiquidacion";
import { BotonGuardar } from "@/components/BotonGuardar";
import { BotonEliminar } from "@/components/BotonEliminar";
import { crearLiquidacion, eliminarLiquidacion, alternarPagadaLiquidacion } from "../actions";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MedidorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const medidor = await db.medidorCliente.findUnique({
    where: { id: Number(id) },
    include: { cliente: true, liquidaciones: { orderBy: { fechaActual: "desc" } } },
  });
  if (!medidor) notFound();

  const ultima = medidor.liquidaciones[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/medidores" className="text-sm text-slate-500 hover:underline">← Volver a medidores</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">
          Medidor {medidor.numero}
          {medidor.cliente && <span className="text-slate-400"> · {medidor.cliente.nombre}</span>}
        </h1>
        <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
          {medidor.marca && <span>🏷️ {medidor.marca}</span>}
          {medidor.direccion && <span>📍 {medidor.direccion}</span>}
          <span>✖️ factor {medidor.factor}</span>
        </p>
      </div>

      {sp.error === "tarifa" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Falta la tarifa CU.</strong> Escribe el valor del $/kWh que aparece en tu extracto.
        </div>
      )}
      {sp.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Liquidación guardada.
        </div>
      )}

      {/* Nueva liquidación */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Nueva liquidación</h2>
        <FormLiquidacion
          medidorId={medidor.id}
          factor={medidor.factor}
          accion={crearLiquidacion}
          tarifaPesosDefault={ultima ? ultima.tarifaCuCents / 100 : null}
          lecturaAnteriorDefault={ultima ? ultima.lecturaActual : null}
          fechaAnteriorDefault={ultima ? fechaParaInput(ultima.fechaActual) : ""}
        />
      </section>

      {/* Historial de liquidaciones */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Liquidaciones</h2>
        {medidor.liquidaciones.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay liquidaciones para este medidor.</p>
        ) : (
          <div className="space-y-3">
            {medidor.liquidaciones.map((l) => {
              const r = liquidarMedidor(l);
              return (
                <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-800">
                        {fmtFecha(l.fechaAnterior)} → {fmtFecha(l.fechaActual)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {l.lecturaAnterior} → {l.lecturaActual} kWh · consumo {r.consumoKwh} kWh · CU {formatMoney(l.tarifaCuCents)}/kWh
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-right">
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="font-bold text-slate-800">{formatMoney(r.totalCents)}</div>
                      </div>
                      {l.pagada ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">✓ Pagada</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Por cobrar</span>
                      )}
                      <Link href={`/medidores/${medidor.id}/liquidacion/${l.id}`} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50">
                        Factura
                      </Link>
                      {l.fotoUrl && (
                        <a href={l.fotoUrl} target="_blank" rel="noopener noreferrer" className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                          Foto
                        </a>
                      )}
                      <form action={alternarPagadaLiquidacion}>
                        <input type="hidden" name="id" value={l.id} />
                        <BotonGuardar className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${l.pagada ? "text-slate-600 hover:bg-slate-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                          {l.pagada ? "Reabrir" : "Marcar pagada"}
                        </BotonGuardar>
                      </form>
                      <BotonEliminar action={eliminarLiquidacion} id={l.id} mensaje="¿Eliminar esta liquidación?" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
