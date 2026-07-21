import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { liquidarMedidor } from "@/lib/finance/medidor";
import { crearMedidor, actualizarMedidor, eliminarMedidor } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { BotonEliminar } from "@/components/BotonEliminar";

export const dynamic = "force-dynamic";

export default async function MedidoresPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const editarId = sp.editar ? Number(sp.editar) : null;

  const [medidores, clientes] = await Promise.all([
    db.medidorCliente.findMany({
      include: { cliente: true, liquidaciones: true },
      orderBy: { id: "desc" },
    }),
    db.cliente.findMany({ orderBy: { nombre: "asc" }, select: { nombre: true } }),
  ]);

  const enEdicion = editarId ? medidores.find((m) => m.id === editarId) ?? null : null;
  const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🔌 Medidores de clientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lleva el control de los medidores que instalaste a tus clientes y liquídales cuánto
          pagar según su consumo y la tarifa del extracto de energía.
        </p>
      </div>

      {sp.error === "numero" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Falta el número del medidor.</strong> Es obligatorio para registrarlo.
        </div>
      )}
      {sp.error === "duplicado" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Ese número de medidor ya está registrado.</strong> Cada medidor debe tener un número único.
        </div>
      )}
      {sp.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Medidor guardado.
        </div>
      )}

      {/* Alta / edición de medidor */}
      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarMedidor : crearMedidor}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm">
          <span className="text-slate-500">Cliente</span>
          <input name="clienteNombre" list="clientes-lista" defaultValue={enEdicion?.cliente?.nombre ?? ""} placeholder="Nombre del cliente" className={inputCls} />
          <datalist id="clientes-lista">
            {clientes.map((c) => <option key={c.nombre} value={c.nombre} />)}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Número del medidor *</span>
          <input name="numero" required defaultValue={enEdicion?.numero ?? ""} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Marca</span>
          <input name="marca" defaultValue={enEdicion?.marca ?? ""} placeholder="HXG" className={inputCls} />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Dirección / local</span>
          <input name="direccion" defaultValue={enEdicion?.direccion ?? ""} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Factor de multiplicación</span>
          <input name="factor" type="number" min="1" defaultValue={enEdicion?.factor ?? 1} className={inputCls} />
        </label>
        <label className="text-sm lg:col-span-3">
          <span className="text-slate-500">Nota (opcional)</span>
          <input name="nota" defaultValue={enEdicion?.nota ?? ""} className={inputCls} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Registrar medidor"}
          </BotonGuardar>
          {enEdicion && (
            <Link href="/medidores" className="text-sm text-slate-500 hover:underline">Cancelar</Link>
          )}
        </div>
      </form>

      {medidores.length === 0 && (
        <p className="text-sm text-slate-400">Aún no has registrado ningún medidor.</p>
      )}

      {/* Lista de medidores */}
      <div className="space-y-3">
        {medidores.map((m) => {
          const pendienteCents = m.liquidaciones
            .filter((l) => !l.pagada)
            .reduce((a, l) => a + liquidarMedidor(l).totalCents, 0);
          return (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">
                    {m.cliente?.nombre ?? "Sin cliente"} · Medidor {m.numero}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {m.marca && <span>🏷️ {m.marca}</span>}
                    {m.direccion && <span>📍 {m.direccion}</span>}
                    <span>✖️ factor {m.factor}</span>
                    <span>{m.liquidaciones.length} liquidación(es)</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-right">
                  <div>
                    <div className="text-xs text-slate-500">Por cobrar</div>
                    <div className={`font-bold ${pendienteCents > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatMoney(pendienteCents)}
                    </div>
                  </div>
                  <Link href={`/medidores/${m.id}`} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700">
                    Ver / liquidar
                  </Link>
                  <Link href={`/medidores?editar=${m.id}`} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    Editar
                  </Link>
                  <BotonEliminar action={eliminarMedidor} id={m.id} mensaje={`¿Eliminar el medidor ${m.numero} y todas sus liquidaciones?`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
