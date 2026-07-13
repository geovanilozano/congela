import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { crearCredito, registrarPago } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { InputDinero } from "@/components/InputDinero";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function CreditoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const creditos = await db.credito.findMany({
    include: { cuotas: { orderBy: { numero: "asc" } } },
    orderBy: { id: "desc" },
  });

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

      {/* Formulario nuevo crédito */}
      <form
        action={crearCredito}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="text-sm lg:col-span-1">
          <span className="text-slate-500">Entidad / prestamista</span>
          <input name="entidad" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Monto financiado ($)</span>
          <InputDinero name="montoPesos" required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Tasa mensual (%)</span>
          <input name="tasaMensualPct" type="number" min="0" step="0.01" defaultValue={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500"># de cuotas</span>
          <input name="numCuotas" type="number" min="1" defaultValue={24} required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Fecha de inicio</span>
          <input name="fechaInicio" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-5">
          Crear crédito y generar tabla de pagos
        </BotonGuardar>
      </form>

      {creditos.length === 0 && (
        <p className="text-sm text-slate-400">Aún no has registrado ningún crédito.</p>
      )}

      {creditos.map((c) => {
        const pagadas = c.cuotas.filter((q) => q.estado === "pagada");
        const saldoPendiente = c.cuotas
          .filter((q) => q.estado !== "pagada")
          .reduce((a, q) => a + q.capitalCents, 0);
        const totalPagado = pagadas.reduce((a, q) => a + q.cuotaCents, 0);
        const totalIntereses = c.cuotas.reduce((a, q) => a + q.interesCents, 0);
        const avance = Math.round((pagadas.length / c.cuotas.length) * 100);
        const proxima = c.cuotas.find((q) => q.estado !== "pagada");

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
              {c.estado === "pagado" ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  ✅ Crédito PAGADO
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                  Activo
                </span>
              )}
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
                        ) : (
                          <form action={registrarPago} className="inline">
                            <input type="hidden" name="cuotaId" value={q.id} />
                            <BotonGuardar className="rounded-md bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700">
                              Registrar pago
                            </BotonGuardar>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
