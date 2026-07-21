import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { necesitaReposicion } from "@/lib/inventario";
import { crearProducto, actualizarProducto, eliminarProducto, guardarRecetaItem, eliminarRecetaItem } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { BotonEliminar } from "@/components/BotonEliminar";
import { InputDinero } from "@/components/InputDinero";

export const dynamic = "force-dynamic";

const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const editarId = sp.editar ? Number(sp.editar) : null;

  const [productos, insumos] = await Promise.all([
    db.producto.findMany({
      include: { receta: { include: { insumo: true } }, _count: { select: { receta: true } } },
      orderBy: { nombre: "asc" },
    }),
    db.insumoInventario.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const enEdicion = editarId ? productos.find((p) => p.id === editarId) ?? null : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧊 Productos y recetas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define lo que vendes (ej. “Bolsa 5 kg”) y su <b>receta</b>: cuánto insumo gasta cada
          bolsa (al menos el empaque). Así, al producir se descuentan los insumos y al vender se
          descuenta el producto — y la app te avisa si vendes más de lo que produjiste.
        </p>
      </div>

      {sp.error === "nombre" && <Aviso>Falta el nombre del producto.</Aviso>}
      {sp.error === "duplicado" && <Aviso>Ya existe un producto con ese nombre.</Aviso>}
      {sp.error === "receta" && <Aviso>Elige un insumo y una cantidad mayor que 0.</Aviso>}
      {sp.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">✓ Guardado.</div>
      )}

      {/* Crear / editar producto */}
      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarProducto : crearProducto}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Nombre del producto *</span>
          <input name="nombre" required defaultValue={enEdicion?.nombre ?? ""} placeholder="Ej: Bolsa 5 kg" className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Unidad</span>
          <input name="unidad" defaultValue={enEdicion?.unidad ?? "bolsa"} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Precio sugerido ($)</span>
          <InputDinero name="precioPesos" defaultValue={enEdicion?.precioSugeridoCents ? enEdicion.precioSugeridoCents / 100 : undefined} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Aviso de stock bajo (unidades)</span>
          <input name="stockMinimo" type="number" min="0" step="1" inputMode="numeric" defaultValue={enEdicion?.stockMinimo ?? 0} className={inputCls} />
        </label>
        {enEdicion && (
          <label className="flex items-end gap-2 pb-1 text-sm">
            <input name="activo" type="checkbox" defaultChecked={enEdicion.activo} className="h-4 w-4" />
            <span className="text-slate-600">Activo (aparece al vender)</span>
          </label>
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Crear producto"}
          </BotonGuardar>
          {enEdicion && (
            <Link href="/productos" className="text-sm text-slate-500 hover:underline">Cancelar</Link>
          )}
        </div>
      </form>

      {/* Editor de receta del producto en edición */}
      {enEdicion && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Receta de «{enEdicion.nombre}»</h2>
          <p className="mt-1 text-sm text-slate-500">Cuánto de cada insumo gasta <b>una</b> unidad de este producto.</p>

          {enEdicion.receta.length > 0 ? (
            <div className="mt-3 space-y-2">
              {enEdicion.receta.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="text-slate-700">
                    <b>{r.cantidad}</b> {r.insumo.unidad} de {r.insumo.nombre}
                  </span>
                  <form action={eliminarRecetaItem}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="productoId" value={enEdicion.id} />
                    <button className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Quitar</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Aún sin receta. Agrega al menos el empaque abajo.</p>
          )}

          {insumos.length === 0 ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Primero registra tus insumos en <Link href="/inventario" className="font-semibold underline">Inventario</Link> (empaques, etc.).
            </p>
          ) : (
            <form action={guardarRecetaItem} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="productoId" value={enEdicion.id} />
              <label className="text-sm">
                <span className="text-slate-500">Insumo</span>
                <select name="insumoId" required className={`${inputCls} w-48`}>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-500">Cantidad por unidad</span>
                <input name="cantidad" type="number" min="0" step="0.01" inputMode="decimal" required placeholder="1" className={`${inputCls} w-32`} />
              </label>
              <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Agregar a la receta
              </BotonGuardar>
            </form>
          )}
        </div>
      )}

      {/* Lista de productos */}
      {productos.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no has creado productos. Crea el primero arriba.</p>
      ) : (
        <div className="space-y-3">
          {productos.map((p) => {
            const bajo = necesitaReposicion({ nombre: p.nombre, stock: p.stock, stockMinimo: p.stockMinimo });
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{p.nombre}</span>
                      {!p.activo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Inactivo</span>}
                      {bajo && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">⚠ Stock bajo</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {p._count.receta} insumo(s) en la receta
                      {p.precioSugeridoCents ? ` · precio sugerido ${formatMoney(p.precioSugeridoCents)}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-right">
                    <div>
                      <div className="text-xs text-slate-500">En stock</div>
                      <div className={`font-bold ${p.stock < 0 ? "text-red-600" : bajo ? "text-amber-600" : "text-slate-700"}`}>
                        {p.stock} {p.unidad}
                      </div>
                    </div>
                    <Link href={`/productos?editar=${p.id}`} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Editar / receta
                    </Link>
                    <BotonEliminar action={eliminarProducto} id={p.id} mensaje={`¿Eliminar el producto «${p.nombre}»? Se borra su receta; el historial de ventas se conserva.`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{children}</div>;
}
