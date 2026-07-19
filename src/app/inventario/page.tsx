import { db } from "@/lib/db";
import { bajoStock, necesitaReposicion } from "@/lib/inventario";
import { BotonEliminar } from "@/components/BotonEliminar";
import { BotonGuardar } from "@/components/BotonGuardar";
import { crearInsumo, moverInventario, eliminarInsumo, actualizarInsumo } from "./actions";

export const dynamic = "force-dynamic";

const UNIDADES = ["unidad", "bolsa", "kg", "litro", "paquete"];

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; error?: string; insumo?: string; hay?: string; buscar?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.buscar ?? "").trim();

  // Filtro de búsqueda por nombre del insumo.
  const filtro = q ? { nombre: { contains: q, mode: "insensitive" as const } } : undefined;

  const insumos = await db.insumoInventario.findMany({ where: filtro, orderBy: { nombre: "asc" } });
  // El aviso global de reposición no depende del filtro de búsqueda: siempre mira todo el inventario.
  const todos = q ? await db.insumoInventario.findMany({ orderBy: { nombre: "asc" } }) : insumos;
  const alertas = bajoStock(todos);
  const enEdicion = sp.editar ? await db.insumoInventario.findUnique({ where: { id: Number(sp.editar) } }) : null;

  // Aviso cuando se intentó sacar más de lo que hay.
  const insumoSinStock =
    sp.error === "sinStock" && sp.insumo
      ? insumos.find((i) => i.id === Number(sp.insumo))
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📦 Inventario</h1>
        <p className="mt-1 text-sm text-slate-500">
          Controla bolsas, insumos y materiales. El sistema te avisa cuando algo baja del mínimo.
        </p>
      </div>

      {insumoSinStock && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No se registró la salida.</strong> No puedes sacar más de lo que hay: de{" "}
          <b>{insumoSinStock.nombre}</b> solo quedan {insumoSinStock.stock} {insumoSinStock.unidad}.
          Ajusta la cantidad o registra primero una entrada.
        </div>
      )}

      {alertas.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ <b>Reponer pronto:</b> {alertas.map((a) => `${a.nombre} (${a.stock} ${a.unidad})`).join(", ")}
        </div>
      )}

      {enEdicion && (
        <form
          key={enEdicion.id}
          action={actualizarInsumo}
          className="grid gap-3 rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          <input type="hidden" name="id" value={enEdicion.id} />
          <label className="text-sm lg:col-span-2">
            <span className="text-slate-500">Nombre del insumo</span>
            <input name="nombre" required defaultValue={enEdicion.nombre} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Unidad</span>
            <select name="unidad" defaultValue={enEdicion.unidad} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Stock mínimo (alerta)</span>
            <input name="stockMinimo" type="number" min="0" step="0.1" defaultValue={enEdicion.stockMinimo} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
            <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
              Guardar cambios
            </BotonGuardar>
            <a href="?" className="text-sm text-slate-500 hover:underline">Cancelar</a>
          </div>
        </form>
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
        <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:col-span-2 lg:col-span-5">
          Agregar insumo
        </BotonGuardar>
      </form>

      {/* Búsqueda de insumos por nombre */}
      <form className="flex flex-wrap gap-2">
        <input
          name="buscar"
          defaultValue={q}
          placeholder="Buscar insumo por nombre…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Buscar</button>
        {q && (
          <a href="/inventario" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Limpiar
          </a>
        )}
      </form>

      <div className="space-y-3">
        {insumos.length === 0 && (
          <p className="text-sm text-slate-400">
            {q ? "No se encontraron insumos." : "Sin insumos aún."}
          </p>
        )}
        {insumos.map((i) => {
          const alerta = necesitaReposicion(i);
          return (
            <div key={i.id} className={`rounded-xl border p-4 shadow-sm ${alerta ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{i.nombre}</span>
                    {alerta && (
                      <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                        ⚠ Stock bajo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Mínimo: {i.stockMinimo} {i.unidad}</div>
                </div>
                <div className={`text-2xl font-bold ${alerta ? "text-amber-600" : "text-slate-800"}`}>
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
                  <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Aplicar</BotonGuardar>
                </form>
                <div className="flex items-center gap-3">
                  <a href={`?editar=${i.id}`} className="text-xs text-sky-600 hover:underline">Editar</a>
                  <BotonEliminar action={eliminarInsumo} id={i.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
