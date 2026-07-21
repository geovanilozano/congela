import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { repartir, mapearReglas, ajustarReglaCredito } from "@/lib/finance/fondos";
import { calcularEsperadoCaja } from "@/lib/finance/arqueo";
import { formatFechaHora } from "@/lib/fechas";
import { ensureFondos } from "@/lib/seed";
import { cerrarCaja, anularUltimoCierre, arquearCaja } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { BotonEliminar } from "@/components/BotonEliminar";
import { FormConfirm } from "@/components/FormConfirm";
import { InputDinero } from "@/components/InputDinero";

export const dynamic = "force-dynamic";

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await ensureFondos();

  // Las tres consultas son independientes: se lanzan en paralelo (un solo viaje
  // de ida y vuelta a la base de datos) en vez de una tras otra.
  const [{ error }, ventas, fondos, cierres, esperado, arqueos] = await Promise.all([
    searchParams,
    db.venta.findMany({ where: { cierreId: null } }),
    db.fondo.findMany({ include: { regla: true } }),
    db.cierreCaja.findMany({
      include: { movimientos: { include: { fondo: true } } },
      orderBy: { id: "desc" },
      take: 10,
    }),
    calcularEsperadoCaja(),
    db.arqueoCaja.findMany({ orderBy: { id: "desc" }, take: 5 }),
  ]);

  const totalPendiente = ventas.reduce((a, v) => a + v.totalCents, 0);

  // Mismo mapeo que usa el cierre real (una sola fuente de verdad, no puede divergir).
  const reglas = mapearReglas(fondos);

  // El fondo "Crédito" solo aporta lo que le falta para completar la próxima cuota. El cierre
  // real hace este mismo ajuste (caja/actions); aquí se replica para que el preview no mienta.
  const fondoCredito = fondos.find((f) => f.nombre === "Crédito");
  if (fondoCredito) {
    const saldoCredito =
      (await db.movimientoFondo.aggregate({ where: { fondoId: fondoCredito.id }, _sum: { montoCents: true } }))._sum.montoCents ?? 0;
    ajustarReglaCredito(reglas, saldoCredito);
  }

  const preview = repartir(totalPendiente, reglas);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔒 Cierre de caja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Al cerrar la caja, el total de las ventas del día se reparte automáticamente en los
          fondos. Así se aparta el arriendo, la cuota del crédito, la reserva y la utilidad.
        </p>
      </div>

      {error === "sinResto" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No se cerró la caja.</strong> Parte del dinero quedaría sin fondo donde caer,
          y no se descarta plata en silencio. Entra a{" "}
          <a href="/fondos" className="font-semibold underline">
            Fondos
          </a>{" "}
          y activa un fondo de tipo <em>Resto (utilidad)</em>: ahí es donde entra lo que sobra
          después de apartar el arriendo, la cuota y la reserva.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total de ventas por cerrar</span>
          <span className="text-2xl font-bold text-slate-800">{formatMoney(totalPendiente)}</span>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-slate-600">Así se repartiría hoy:</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {reglas
              .filter((r) => r.activo)
              .sort((a, b) => a.prioridad - b.prioridad)
              .map((r) => (
                <div key={r.fondo} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">{r.fondo}</span>
                  <span className="font-semibold text-slate-800">{formatMoney(preview[r.fondo] ?? 0)}</span>
                </div>
              ))}
          </div>
        </div>

        <FormConfirm
          action={cerrarCaja}
          mensaje={`¿Cerrar la caja y repartir ${formatMoney(totalPendiente)} en los fondos? Si algo queda mal, puedes anular el cierre después.`}
          className="mt-5"
        >
          <BotonGuardar
            disabled={totalPendiente === 0}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Cerrar caja y repartir el dinero
          </BotonGuardar>
        </FormConfirm>
      </div>

      {/* Arqueo: contar el efectivo real y compararlo con el esperado */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">💵 Arqueo: contar el efectivo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cuenta el dinero que tienes en el cajón y compáralo con lo que la app espera. Hazlo
          <b> después de cerrar la caja</b>, cuando ya se repartió todo.
        </p>

        {esperado.ventasSinCerrarCents > 0 && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Tienes <b>{formatMoney(esperado.ventasSinCerrarCents)}</b> en ventas sin cerrar. Esa
            plata ya está en el cajón pero todavía no en los bolsillos. <b>Cierra la caja primero</b> para
            que el arqueo cuadre.
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Esperado + desglose */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Esperado en caja</div>
            <div className="text-2xl font-bold text-slate-800">{formatMoney(esperado.esperadoCents)}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              {esperado.desglose.map((d) => (
                <div key={d.nombre} className="flex justify-between">
                  <span>{d.nombre}</span>
                  <span className="tabular-nums">{formatMoney(d.saldo)}</span>
                </div>
              ))}
              {esperado.fiadoPendienteCents > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>− Fiado por cobrar</span>
                  <span className="tabular-nums">−{formatMoney(esperado.fiadoPendienteCents)}</span>
                </div>
              )}
              <div className="mt-1 border-t border-slate-200 pt-1 text-[11px] text-slate-400">
                Solo cuentan los bolsillos marcados como “efectivo” (se elige en Fondos).
              </div>
            </div>
          </div>

          {/* Conteo */}
          <form action={arquearCaja} className="flex flex-col gap-3">
            <label className="text-sm">
              <span className="text-slate-600">¿Cuánto dinero contaste en la caja?</span>
              <InputDinero
                name="contadoPesos"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Nota (opcional)</span>
              <input
                name="nota"
                placeholder="Ej: faltó registrar una compra"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
              Registrar arqueo
            </BotonGuardar>
          </form>
        </div>

        {arqueos.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-sm font-medium text-slate-600">Arqueos recientes</div>
            <div className="space-y-2">
              {arqueos.map((a) => {
                const cuadra = a.diferenciaCents === 0;
                const sobra = a.diferenciaCents > 0;
                return (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-500">{formatFechaHora(a.fecha)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        Contó {formatMoney(a.contadoCents)} · esperado {formatMoney(a.esperadoCents)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          cuadra
                            ? "bg-emerald-100 text-emerald-700"
                            : sobra
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {cuadra ? "Caja cuadrada" : sobra ? `Sobrante ${formatMoney(a.diferenciaCents)}` : `Faltante ${formatMoney(-a.diferenciaCents)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Cierres anteriores</h2>
        {cierres.length === 0 && <p className="text-sm text-slate-400">Aún no has cerrado ninguna caja.</p>}
        <div className="space-y-3">
          {cierres.map((c, idx) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700">Cierre #{c.id} · {formatFechaHora(c.fecha)}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">{formatMoney(c.totalCents)}</span>
                  {/* Solo se puede anular el más reciente (el primero de la lista). */}
                  {idx === 0 && (
                    <BotonEliminar
                      action={anularUltimoCierre}
                      mensaje="¿Anular este cierre? Las ventas volverán a quedar pendientes y se revertirá el reparto en los fondos."
                    >
                      Anular
                    </BotonEliminar>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.movimientos.map((m) => (
                  <span key={m.id} className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs text-sky-700">
                    {m.fondo.nombre}: {formatMoney(m.montoCents)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
