import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { repartir, ReglaFondo } from "@/lib/finance/fondos";
import { ensureFondos } from "@/lib/seed";
import { cerrarCaja, anularUltimoCierre } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { BotonEliminar } from "@/components/BotonEliminar";
import { FormConfirm } from "@/components/FormConfirm";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await ensureFondos();

  // Las tres consultas son independientes: se lanzan en paralelo (un solo viaje
  // de ida y vuelta a la base de datos) en vez de una tras otra.
  const [{ error }, ventas, fondos, cierres] = await Promise.all([
    searchParams,
    db.venta.findMany({ where: { cierreId: null } }),
    db.fondo.findMany({ include: { regla: true } }),
    db.cierreCaja.findMany({
      include: { movimientos: { include: { fondo: true } } },
      orderBy: { id: "desc" },
      take: 10,
    }),
  ]);

  const totalPendiente = ventas.reduce((a, v) => a + v.totalCents, 0);

  const reglas: ReglaFondo[] = fondos
    .filter((f) => f.regla)
    .map((f) => ({
      fondo: f.nombre,
      tipo: f.regla!.tipo as ReglaFondo["tipo"],
      valorCents: f.regla!.valorCents ?? undefined,
      valor: f.regla!.valor ?? undefined,
      prioridad: f.regla!.prioridad,
      activo: f.regla!.activo,
    }));

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

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Cierres anteriores</h2>
        {cierres.length === 0 && <p className="text-sm text-slate-400">Aún no has cerrado ninguna caja.</p>}
        <div className="space-y-3">
          {cierres.map((c, idx) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700">Cierre #{c.id} · {fmtFecha(c.fecha)}</span>
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
