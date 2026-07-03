import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { repartir, ReglaFondo } from "@/lib/finance/fondos";
import { ensureFondos } from "@/lib/seed";
import { cerrarCaja } from "./actions";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function CajaPage() {
  await ensureFondos();

  const ventas = await db.venta.findMany({ where: { cierreId: null } });
  const totalPendiente = ventas.reduce((a, v) => a + v.totalCents, 0);

  const fondos = await db.fondo.findMany({ include: { regla: true } });
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

  const cierres = await db.cierreCaja.findMany({
    include: { movimientos: { include: { fondo: true } } },
    orderBy: { id: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔒 Cierre de caja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Al cerrar la caja, el total de las ventas del día se reparte automáticamente en los
          fondos. Así se aparta el arriendo, la cuota del crédito, la reserva y la utilidad.
        </p>
      </div>

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

        <form action={cerrarCaja} className="mt-5">
          <button
            disabled={totalPendiente === 0}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Cerrar caja y repartir el dinero
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Cierres anteriores</h2>
        {cierres.length === 0 && <p className="text-sm text-slate-400">Aún no has cerrado ninguna caja.</p>}
        <div className="space-y-3">
          {cierres.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Cierre #{c.id} · {fmtFecha(c.fecha)}</span>
                <span className="font-bold text-slate-800">{formatMoney(c.totalCents)}</span>
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
