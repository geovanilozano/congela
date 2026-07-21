import { db } from "@/lib/db";
import { ensureFondos } from "@/lib/seed";
import { formatMoney } from "@/lib/finance/money";
import { guardarRegla } from "./actions";
import { alternarEsEfectivo } from "../caja/actions";
import { FONDO_INGRESO_ENERGIA } from "@/lib/seed";
import { BotonGuardar } from "@/components/BotonGuardar";
import { InputDinero } from "@/components/InputDinero";

// Bolsillos que la app maneja sola (no se editan a mano): el de Crédito se recalcula con cada
// crédito; el de Energía revendida recibe el cobro de los inquilinos al marcar una liquidación.
const NOTA_AUTOMATICO: Record<string, string> = {
  "Crédito": "Este fondo se ajusta solo: aparta lo que falta para la próxima cuota de tus créditos activos y se vacía al pagarla. No hace falta configurarlo a mano.",
  [FONDO_INGRESO_ENERGIA]: "Este bolsillo recibe solo lo que te pagan los inquilinos por la energía (al marcar una liquidación como pagada). No participa del reparto del cierre de caja.",
};

export const dynamic = "force-dynamic";

// Paleta de colores por fondo (clases estáticas para que Tailwind las incluya).
const COLORES = [
  { barra: "bg-sky-500", punto: "bg-sky-500", chip: "bg-sky-50 text-sky-700" },
  { barra: "bg-emerald-500", punto: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  { barra: "bg-amber-500", punto: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  { barra: "bg-violet-500", punto: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
  { barra: "bg-rose-500", punto: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  { barra: "bg-cyan-500", punto: "bg-cyan-500", chip: "bg-cyan-50 text-cyan-700" },
  { barra: "bg-indigo-500", punto: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700" },
  { barra: "bg-teal-500", punto: "bg-teal-500", chip: "bg-teal-50 text-teal-700" },
] as const;

// Describe la regla de reparto de forma legible para el usuario.
function describirRegla(regla: {
  tipo: string;
  valorCents: number | null;
  valor: number | null;
} | null): string {
  if (!regla) return "Sin regla configurada";
  if (regla.tipo === "resto") return "El resto (utilidad)";
  if (regla.tipo === "fijo") return `${formatMoney(regla.valorCents ?? 0)} fijo`;
  if (regla.tipo === "porcentaje") {
    const pct = (regla.valor ?? 0) * 100;
    return `${Number(pct.toFixed(2))}% del ingreso`;
  }
  return "Regla desconocida";
}

export default async function FondosPage() {
  await ensureFondos();

  // El saldo de cada fondo se pide agregado (suma de movimientos por fondoId) en vez de
  // traer todos los movimientos: es la tabla que más crece (una fila por fondo en cada cierre).
  const [fondos, saldosFondo] = await Promise.all([
    db.fondo.findMany({ include: { regla: true }, orderBy: { regla: { prioridad: "asc" } } }),
    db.movimientoFondo.groupBy({ by: ["fondoId"], _sum: { montoCents: true } }),
  ]);

  // Saldo por fondo y total general (para calcular el peso relativo de cada barra).
  const saldoPorFondoId = new Map(saldosFondo.map((g) => [g.fondoId, g._sum.montoCents ?? 0]));
  const saldos = fondos.map((f) => saldoPorFondoId.get(f.id) ?? 0);
  const totalSaldo = saldos.reduce((a, s) => a + s, 0);
  const baseReparto = saldos.reduce((a, s) => a + Math.max(0, s), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🪙 Fondos (reparto del dinero)</h1>
        <p className="mt-1 text-sm text-slate-500">
          De cada cierre de caja, el dinero se aparta en este orden de prioridad. Los
          <b> fijos</b> toman su monto; los de <b>porcentaje</b> un % de la venta; el fondo
          <b> resto</b> (Utilidad) recibe lo que sobra.
        </p>
      </div>

      {/* Resumen: saldo de cada fondo, su peso relativo y el total general. */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Saldos de los fondos
          </h2>
          <div className="text-right">
            <span className="text-xs text-slate-500">Total general</span>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(totalSaldo)}</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {fondos.map((f, i) => {
            const saldo = saldos[i];
            const color = COLORES[i % COLORES.length];
            const peso = baseReparto > 0 ? (Math.max(0, saldo) / baseReparto) * 100 : 0;
            const r = f.regla;
            // Los bolsillos automáticos (sin regla de reparto) no se marcan "Inactivo".
            const inactivo = !NOTA_AUTOMATICO[f.nombre] && !r?.activo;
            return (
              <div key={f.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.punto}`} />
                    <span className="truncate font-medium text-slate-700">{f.nombre}</span>
                    {inactivo && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-xs text-slate-400">
                      {peso.toFixed(1)}%
                    </span>
                    <span className="tabular-nums font-semibold text-slate-800">
                      {formatMoney(saldo)}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${color.barra} ${inactivo ? "opacity-40" : ""}`}
                    style={{ width: `${Math.min(100, peso)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {baseReparto === 0 && (
            <p className="text-sm text-slate-400">
              Aún no hay saldos en los fondos. Se irán llenando con cada cierre de caja.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {fondos.map((f, i) => {
          const saldo = saldos[i];
          const color = COLORES[i % COLORES.length];
          const r = f.regla;

          // Bolsillos automáticos (Crédito, Energía revendida): la app los maneja sola. Si el
          // dueño los editara a mano, el cambio se perdería o mezclaría con el reparto. SOLO LECTURA.
          if (NOTA_AUTOMATICO[f.nombre]) {
            return (
              <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.punto}`} />
                    <h2 className="truncate font-semibold text-slate-800">{f.nombre}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color.chip}`}>
                    Saldo: {formatMoney(saldo)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 font-medium text-sky-700">Automático</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">{NOTA_AUTOMATICO[f.nombre]}</p>
                <form action={alternarEsEfectivo} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                  <input type="hidden" name="fondoId" value={f.id} />
                  <input type="checkbox" name="esEfectivo" defaultChecked={f.esEfectivo} className="h-4 w-4" />
                  <span className="text-slate-500">Es efectivo (cuenta para el arqueo)</span>
                  <button className="ml-auto rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 hover:bg-slate-200">Guardar</button>
                </form>
              </div>
            );
          }

          return (
            <form
              key={f.id}
              action={guardarRegla}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="reglaId" value={r?.id} />
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.punto}`} />
                  <h2 className="truncate font-semibold text-slate-800">{f.nombre}</h2>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color.chip}`}>
                  Saldo: {formatMoney(saldo)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {describirRegla(r)}
                </span>
                <span
                  className={
                    r?.activo
                      ? "rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
                      : "rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-500"
                  }
                >
                  {r?.activo ? "Activa" : "Inactiva"}
                </span>
                {r && (
                  <span className="text-slate-400">Prioridad {r.prioridad}</span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <label className="col-span-2">
                  <span className="text-slate-500">Tipo de regla</span>
                  <select
                    name="tipo"
                    defaultValue={r?.tipo ?? "fijo"}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  >
                    <option value="fijo">Fijo (monto en pesos)</option>
                    <option value="porcentaje">Porcentaje de la venta</option>
                    <option value="resto">Resto (utilidad)</option>
                  </select>
                </label>

                <label>
                  <span className="text-slate-500">Monto fijo ($)</span>
                  <InputDinero
                    name="valorPesos"
                    defaultValue={r?.valorCents ? r.valorCents / 100 : undefined}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <label>
                  <span className="text-slate-500">Porcentaje (%)</span>
                  <input
                    name="valorPorcentaje"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={r?.valor ? r.valor * 100 : 0}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <label>
                  <span className="text-slate-500">Prioridad</span>
                  <input
                    name="prioridad"
                    type="number"
                    min="1"
                    defaultValue={r?.prioridad ?? 10}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <label className="flex items-end gap-2 pb-1">
                  <input
                    name="activo"
                    type="checkbox"
                    defaultChecked={r?.activo ?? true}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-600">Activo</span>
                </label>

                <label className="flex items-end gap-2 pb-1" title="Cuenta como efectivo en el arqueo de caja">
                  <input
                    name="esEfectivo"
                    type="checkbox"
                    defaultChecked={f.esEfectivo}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-600">Es efectivo</span>
                </label>
              </div>

              <BotonGuardar className="mt-4 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700">
                Guardar
              </BotonGuardar>
            </form>
          );
        })}
      </div>
    </div>
  );
}
