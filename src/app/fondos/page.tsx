import { db } from "@/lib/db";
import { ensureFondos } from "@/lib/seed";
import { formatMoney } from "@/lib/finance/money";
import { guardarRegla } from "./actions";

export const dynamic = "force-dynamic";

export default async function FondosPage() {
  await ensureFondos();

  const fondos = await db.fondo.findMany({
    include: { regla: true, movimientos: true },
    orderBy: { regla: { prioridad: "asc" } },
  });

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

      <div className="grid gap-4 sm:grid-cols-2">
        {fondos.map((f) => {
          const saldo = f.movimientos.reduce((a, m) => a + m.montoCents, 0);
          const r = f.regla;
          return (
            <form
              key={f.id}
              action={guardarRegla}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="reglaId" value={r?.id} />
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">{f.nombre}</h2>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  Saldo: {formatMoney(saldo)}
                </span>
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
                  <input
                    name="valorPesos"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={r?.valorCents ? r.valorCents / 100 : 0}
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
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                Guardar
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
