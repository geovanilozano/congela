import { db } from "@/lib/db";
import { bajoStock, necesitaReposicion } from "@/lib/inventario";
import { crearInsumo, moverInventario, eliminarInsumo } from "./actions";

export const dynamic = "force-dynamic";

const UNIDADES = ["unidad", "bolsa", "kg", "litro", "paquete"];

export default async function InventarioPage() {
  const insumos = await db.insumoInventario.findMany({ orderBy: { nombre: "asc" } });
  const alertas = bajoStock(insumos);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📦 Inventario</h1>
        <p className="mt-1 text-sm text-slate-500">
          Controla bolsas, insumos y materiales. El sistema te avisa cuando algo baja del mínimo.
        </p>
      </div>

      {alertas.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ <b>Reponer pronto:</b> {alertas.map((a) => `${a.nombre} (${a.stock} ${a.unidad})`).join(", ")}
        </div>
      )}

      <form action={crearInsumo} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Nombre del insumo</span>
          <input name="nombre" required placeholder="Bolsas 5kg" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Unidad</span>
          <select name="unidad" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Stock inicial</span>
          <input name="stock" type="number" min="0" step="0.1" defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Stock mínimo (alerta)</span>
          <input name="stockMinimo" type="number" min="0" step="0.1" defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-5">
          Agregar insumo
        </button>
      </form>

      <div className="space-y-3">
        {insumos.length === 0 && <p className="text-sm text-slate-400">Sin insumos aún.</p>}
        {insumos.map((i) => {
          const alerta = necesitaReposicion(i);
          return (
            <div key={i.id} className={`rounded-xl border p-4 shadow-sm ${alerta ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800">{i.nombre}</div>
                  <div className="text-xs text-slate-500">Mínimo: {i.stockMinimo} {i.unidad}</div>
                </div>
                <div className={`text-2xl font-bold ${alerta ? "text-red-600" : "text-slate-800"}`}>
                  {i.stock} <span className="text-sm font-normal text-slate-500">{i.unidad}</span>
                </div>
                <form action={moverInventario} className="flex items-end gap-2">
                  <input type="hidden" name="insumoId" value={i.id} />
                  <label className="text-xs">
                    <span className="text-slate-500">Cantidad</span>
                    <input name="cantidad" type="number" min="0" step="0.1" className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-1.5" />
                  </label>
                  <select name="tipo" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>
                  <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Aplicar</button>
                </form>
                <form action={eliminarInsumo}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="text-xs text-red-500 hover:underline">Eliminar</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
