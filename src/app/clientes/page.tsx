import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { resumenClientes } from "@/lib/clientes";
import { registrarPagoCliente } from "../ventas/actions";
import { BotonGuardar } from "@/components/BotonGuardar";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ClientesPage() {
  const [clientes, ventas] = await Promise.all([
    db.cliente.findMany({ orderBy: { nombre: "asc" } }),
    db.venta.findMany({
      select: { id: true, clienteId: true, totalCents: true, formaPago: true, pagada: true, fecha: true },
      orderBy: { fecha: "desc" },
    }),
  ]);

  const resumen = resumenClientes(clientes, ventas);
  const totalPorCobrar = resumen.reduce((a, c) => a + c.porCobrarCents, 0);

  // Ventas a crédito no pagadas de cada cliente, para listarlas y poder marcarlas.
  const pendientesDe = (clienteId: number) =>
    ventas.filter((v) => v.clienteId === clienteId && v.formaPago === "credito" && !v.pagada);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧑‍🤝‍🧑 Clientes y cuentas por cobrar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quién te ha comprado y cuánto te deben del fiado. Cuando un cliente pague, marca la
          venta como pagada para bajar su deuda.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-amber-500 px-5 py-3 text-white">
        <span className="text-sm">Total por cobrar (fiado sin pagar)</span>
        <span className="text-lg font-bold">{formatMoney(totalPorCobrar)}</span>
      </div>

      {clientes.length === 0 && <p className="text-sm text-slate-400">Aún no hay clientes registrados.</p>}

      <div className="space-y-3">
        {resumen.map((c) => {
          const pendientes = pendientesDe(c.id);
          return (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800">{c.nombre}</div>
                  {c.telefono && <div className="text-xs text-slate-500">{c.telefono}</div>}
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-xs text-slate-500">Total comprado</div>
                    <div className="font-medium text-slate-700">{formatMoney(c.totalCompradoCents)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Te debe</div>
                    <div className={`font-bold ${c.porCobrarCents > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatMoney(c.porCobrarCents)}
                    </div>
                  </div>
                </div>
              </div>

              {pendientes.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {pendientes.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {fmtFecha(v.fecha)} · {formatMoney(v.totalCents)}
                      </span>
                      <form action={registrarPagoCliente}>
                        <input type="hidden" name="id" value={v.id} />
                        <BotonGuardar className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                          Marcar pagada
                        </BotonGuardar>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
