import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { estadoCuota } from "@/lib/finance/cuotas";
import { crearCredito, actualizarCredito, eliminarCredito, registrarPago } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { BotonEliminar } from "@/components/BotonEliminar";
import { InputDinero } from "@/components/InputDinero";
import { fechaParaInput } from "@/lib/fechas";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function CreditoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; editar?: string; ok?: string }>;
}) {
  const { error, editar, ok } = await searchParams;
  const editarId = editar ? Number(editar) : null;
  const creditos = await db.credito.findMany({
    include: { cuotas: { orderBy: { numero: "asc" } } },
    orderBy: { id: "desc" },
  });

  // Crédito en edición (si se pidió y no tiene abonos: editar regenera la tabla de pagos).
  const enEdicion = editarId ? creditos.find((c) => c.id === editarId) ?? null : null;

  // ---- Resumen global del crédito ----
  // Se agregan todas las cuotas de todos los créditos registrados para dar una
  // foto única del endeudamiento (total, abonado, saldo y % pagado).
  const hoy = new Date();
  const todasCuotas = creditos.flatMap((c) => c.cuotas);
  const totalCreditoGlobal = todasCuotas.reduce((a, q) => a + q.cuotaCents, 0);
  const totalAbonadoGlobal = todasCuotas.reduce((a, q) => a + q.abonadoCents, 0);
  const saldoPendienteGlobal = totalCreditoGlobal - totalAbonadoGlobal;
  const pctPagado =
    totalCreditoGlobal > 0 ? Math.round((totalAbonadoGlobal / totalCreditoGlobal) * 100) : 0;

  // Próxima cuota a pagar: la cuota NO saldada más próxima por fecha de vencimiento.
  const proximaCuota =
    todasCuotas
      .filter((q) => q.estado !== "pagada")
      .sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime())[0] ?? null;
  const estadoProxima = proximaCuota ? estadoCuota(proximaCuota, hoy) : null;
  const faltaProxima = proximaCuota ? proximaCuota.cuotaCents - proximaCuota.abonadoCents : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">💳 Crédito de la inversión</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra el crédito con que compraste equipos y paneles. El sistema genera la
          tabla de pagos (amortización) y lleva el saldo hasta que quede en cero.
        </p>
      </div>

      {error === "monto" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No se creó el crédito.</strong> El monto financiado debe ser mayor que $0.
        </div>
      )}
      {error === "abono" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No se registró el abono.</strong> Escribe un monto mayor que $0.
        </div>
      )}
      {error === "editarConAbonos" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No se puede editar un crédito que ya tiene abonos.</strong> Para no perder el
          avance de pago, elimínalo y créalo de nuevo con los datos correctos.
        </div>
      )}
      {ok === "editado" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Crédito actualizado. Se regeneró la tabla de pagos.
        </div>
      )}

      {/* Resumen del crédito: KPIs, barra de progreso y próxima cuota a pagar */}
      {creditos.length > 0 && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Resumen del crédito
            </h2>
            <span className="text-xs text-slate-400">
              {creditos.length === 1 ? "1 crédito registrado" : `${creditos.length} créditos registrados`}
            </span>
          </div>

          {/* KPIs principales */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <div className="text-xs text-slate-500">Total del crédito</div>
              <div className="mt-0.5 text-lg font-semibold text-slate-800">
                {formatMoney(totalCreditoGlobal)}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
              <div className="text-xs text-emerald-700">Total abonado</div>
              <div className="mt-0.5 text-lg font-semibold text-emerald-800">
                {formatMoney(totalAbonadoGlobal)}
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
              <div className="text-xs text-amber-700">Saldo pendiente</div>
              <div className="mt-0.5 text-lg font-semibold text-amber-800">
                {formatMoney(saldoPendienteGlobal)}
              </div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 shadow-sm">
              <div className="text-xs text-sky-700">% pagado</div>
              <div className="mt-0.5 text-lg font-semibold text-sky-800">{pctPagado}%</div>
            </div>
          </div>

          {/* Barra de progreso del pago */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Avance del pago</span>
              <span className="font-semibold text-emerald-700">{pctPagado}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pctPagado}%` }}
              />
            </div>
          </div>

          {/* Próxima cuota a pagar */}
          {proximaCuota ? (
            <div
              className={`rounded-lg border p-4 ${
                estadoProxima === "vencida"
                  ? "border-red-300 bg-red-50"
                  : estadoProxima === "proxima"
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      estadoProxima === "vencida"
                        ? "text-red-700"
                        : estadoProxima === "proxima"
                          ? "text-amber-700"
                          : "text-slate-500"
                    }`}
                  >
                    {estadoProxima === "vencida"
                      ? "⚠️ Próxima cuota · VENCIDA"
                      : estadoProxima === "proxima"
                        ? "⏳ Próxima cuota · por vencer"
                        : "Próxima cuota a pagar"}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    Cuota {proximaCuota.numero} · vence {fmtFecha(proximaCuota.fechaVencimiento)}
                  </div>
                  {proximaCuota.abonadoCents > 0 && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      Ya abonaste {formatMoney(proximaCuota.abonadoCents)} de{" "}
                      {formatMoney(proximaCuota.cuotaCents)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Falta por pagar</div>
                  <div
                    className={`text-xl font-bold ${
                      estadoProxima === "vencida"
                        ? "text-red-700"
                        : estadoProxima === "proxima"
                          ? "text-amber-700"
                          : "text-slate-800"
                    }`}
                  >
                    {formatMoney(faltaProxima)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              🎉 ¡No hay cuotas pendientes! El crédito está al día.
            </div>
          )}
        </div>
      )}

      {/* Formulario crear / editar crédito */}
      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarCredito : crearCredito}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        {enEdicion && (
          <p className="text-sm font-medium text-sky-700 sm:col-span-2 lg:col-span-5">
            ✏️ Editando el crédito «{enEdicion.entidad || "Crédito"}». Al guardar se regenera la tabla de pagos.
          </p>
        )}
        <label className="text-sm lg:col-span-1">
          <span className="text-slate-500">Entidad / prestamista</span>
          <input name="entidad" defaultValue={enEdicion?.entidad ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Monto financiado ($)</span>
          <InputDinero name="montoPesos" required defaultValue={enEdicion ? enEdicion.montoCents / 100 : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Tasa mensual (%)</span>
          <input name="tasaMensualPct" type="number" min="0" step="0.01" defaultValue={enEdicion ? Number((enEdicion.tasaMensual * 100).toFixed(2)) : 2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500"># de cuotas</span>
          <input name="numCuotas" type="number" min="1" defaultValue={enEdicion?.numCuotas ?? 24} required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha de inicio</span>
          <input name="fechaInicio" type="date" defaultValue={enEdicion ? fechaParaInput(enEdicion.fechaInicio) : ""} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios y regenerar tabla" : "Crear crédito y generar tabla de pagos"}
          </BotonGuardar>
          {enEdicion && (
            <Link href="/credito" className="text-sm text-slate-500 hover:underline">
              Cancelar
            </Link>
          )}
        </div>
      </form>

      {creditos.length === 0 && (
        <p className="text-sm text-slate-400">Aún no has registrado ningún crédito.</p>
      )}

      {creditos.map((c) => {
        const totalCredito = c.cuotas.reduce((a, q) => a + q.cuotaCents, 0);
        const totalPagado = c.cuotas.reduce((a, q) => a + q.abonadoCents, 0);
        // Saldo pendiente = lo que falta por pagar (cuota menos lo abonado en cada una).
        const saldoPendiente = totalCredito - totalPagado;
        const totalIntereses = c.cuotas.reduce((a, q) => a + q.interesCents, 0);
        const avance = totalCredito > 0 ? Math.round((totalPagado / totalCredito) * 100) : 0;
        const proxima = c.cuotas.find((q) => q.estado !== "pagada");
        // Monto sugerido para el abono: lo que falta de la próxima cuota.
        const sugerido = proxima ? proxima.cuotaCents - proxima.abonadoCents : 0;

        return (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <h2 className="font-semibold text-slate-800">
                  {c.entidad || "Crédito"} · {formatMoney(c.montoCents)}
                </h2>
                <p className="text-xs text-slate-500">
                  {(c.tasaMensual * 100).toFixed(2)}% mensual · {c.numCuotas} cuotas
                </p>
              </div>
              <div className="flex items-center gap-3">
                {c.estado === "pagado" ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    ✅ Crédito PAGADO
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    Activo
                  </span>
                )}
                {/* Editar solo si aún no tiene abonos (editar regenera la tabla de pagos). */}
                {totalPagado === 0 && (
                  <Link href={`/credito?editar=${c.id}`} className="text-xs text-sky-600 hover:underline">
                    Editar
                  </Link>
                )}
                <BotonEliminar
                  action={eliminarCredito}
                  id={c.id}
                  mensaje={`¿Eliminar el crédito «${c.entidad || "Crédito"}» y toda su tabla de pagos? Esta acción no se puede deshacer.`}
                />
              </div>
            </div>

            {/* Indicadores */}
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              <Indicador label="Saldo pendiente" valor={formatMoney(saldoPendiente)} />
              <Indicador label="Total pagado" valor={formatMoney(totalPagado)} />
              <Indicador label="Intereses del crédito" valor={formatMoney(totalIntereses)} />
              <Indicador
                label="Avance"
                valor={`${avance}%`}
                extra={proxima ? `Próxima: cuota ${proxima.numero} (${fmtFecha(proxima.fechaVencimiento)})` : "Sin cuotas pendientes"}
              />
            </div>
            <div className="px-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-sky-500" style={{ width: `${avance}%` }} />
              </div>
            </div>

            {/* Tabla de amortización */}
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">#</th>
                    <th>Vence</th>
                    <th className="text-right">Cuota</th>
                    <th className="text-right">Capital</th>
                    <th className="text-right">Interés</th>
                    <th className="text-right">Saldo</th>
                    <th className="text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {c.cuotas.map((q) => (
                    <tr key={q.id} className="border-t border-slate-100">
                      <td className="py-1.5">{q.numero}</td>
                      <td>{fmtFecha(q.fechaVencimiento)}</td>
                      <td className="text-right">{formatMoney(q.cuotaCents)}</td>
                      <td className="text-right text-slate-500">{formatMoney(q.capitalCents)}</td>
                      <td className="text-right text-slate-500">{formatMoney(q.interesCents)}</td>
                      <td className="text-right">{formatMoney(q.saldoCents)}</td>
                      <td className="text-right">
                        {q.estado === "pagada" ? (
                          <span className="text-emerald-600">Pagada</span>
                        ) : q.estado === "parcial" ? (
                          <span className="text-amber-600">Abonado {formatMoney(q.abonadoCents)}</span>
                        ) : (
                          <span className="text-slate-400">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Registrar un abono al crédito (cuota completa, parcial o adelantar varias) */}
            {c.estado !== "pagado" && (
              <form action={registrarPago} className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4">
                <input type="hidden" name="creditoId" value={c.id} />
                <label className="text-sm">
                  <span className="text-slate-500">Abonar al crédito ($)</span>
                  <InputDinero
                    name="montoPesos"
                    defaultValue={sugerido / 100}
                    required
                    className="mt-1 w-40 rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>
                <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
                  Registrar abono
                </BotonGuardar>
                <span className="text-xs text-slate-400">
                  Puedes pagar la cuota completa, menos (abono parcial) o más (adelanta cuotas).
                </span>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Indicador({ label, valor, extra }: { label: string; valor: string; extra?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-800">{valor}</div>
      {extra && <div className="mt-0.5 text-xs text-slate-400">{extra}</div>}
    </div>
  );
}
