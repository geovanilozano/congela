import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { resumenClientes } from "@/lib/clientes";
import { registrarPagoCliente } from "../ventas/actions";
import { crearCliente, actualizarCliente } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { enlaceWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const editarId = sp.editar ? Number(sp.editar) : null;

  const [clientes, ventas, enEdicion] = await Promise.all([
    db.cliente.findMany({ orderBy: { nombre: "asc" } }),
    db.venta.findMany({
      select: { id: true, clienteId: true, totalCents: true, formaPago: true, pagada: true, fecha: true },
      orderBy: { fecha: "desc" },
    }),
    editarId ? db.cliente.findUnique({ where: { id: editarId } }) : Promise.resolve(null),
  ]);

  const resumen = resumenClientes(clientes, ventas);
  const totalPorCobrar = resumen.reduce((a, c) => a + c.porCobrarCents, 0);

  // Ventas a crédito no pagadas de cada cliente, para listarlas y poder marcarlas.
  const pendientesDe = (clienteId: number) =>
    ventas.filter((v) => v.clienteId === clienteId && v.formaPago === "credito" && !v.pagada);

  const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧑‍🤝‍🧑 Clientes y cuentas por cobrar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra tus clientes (solo el nombre es obligatorio). Luego, al hacer una venta,
          podrás elegirlos escribiendo su nombre. Abajo ves cuánto te deben del fiado.
        </p>
      </div>

      {sp.error === "nombre" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Falta el nombre.</strong> Es el único dato obligatorio para registrar un cliente.
        </div>
      )}
      {sp.ok && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Cliente guardado.
        </div>
      )}

      {/* Formulario crear / editar cliente */}
      <form
        key={enEdicion?.id ?? "nuevo"}
        action={enEdicion ? actualizarCliente : crearCliente}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        {enEdicion && <input type="hidden" name="id" value={enEdicion.id} />}
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Nombre completo *</span>
          <input name="nombre" required defaultValue={enEdicion?.nombre ?? ""} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Teléfono</span>
          <input name="telefono" defaultValue={enEdicion?.telefono ?? ""} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cédula</span>
          <input name="cedula" defaultValue={enEdicion?.cedula ?? ""} className={inputCls} />
        </label>
        <label className="text-sm lg:col-span-2">
          <span className="text-slate-500">Correo electrónico</span>
          <input name="correo" type="email" defaultValue={enEdicion?.correo ?? ""} className={inputCls} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-2">
          <BotonGuardar className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
            {enEdicion ? "Guardar cambios" : "Registrar cliente"}
          </BotonGuardar>
          {enEdicion && (
            <Link href="/clientes" className="text-sm text-slate-500 hover:underline">
              Cancelar
            </Link>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between rounded-xl bg-amber-500 px-5 py-3 text-white">
        <span className="text-sm">Total por cobrar (fiado sin pagar)</span>
        <span className="text-lg font-bold">{formatMoney(totalPorCobrar)}</span>
      </div>

      {clientes.length === 0 && <p className="text-sm text-slate-400">Aún no hay clientes registrados.</p>}

      <div className="space-y-3">
        {resumen.map((c) => {
          const raw = clientes.find((cl) => cl.id === c.id);
          const pendientes = pendientesDe(c.id);
          // Recordatorio de cobro por WhatsApp: solo si te debe y tiene teléfono.
          const waLink =
            c.porCobrarCents > 0 && raw?.telefono
              ? enlaceWhatsApp(
                  raw.telefono,
                  `Hola ${c.nombre} 👋, te recordamos tu saldo pendiente con Congela: ${formatMoney(c.porCobrarCents)}. ¡Gracias por tu compra! 🧊`,
                )
              : null;
          return (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{c.nombre}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {raw?.telefono && <span>📞 {raw.telefono}</span>}
                    {raw?.cedula && <span>🪪 {raw.cedula}</span>}
                    {raw?.correo && <span>✉️ {raw.correo}</span>}
                  </div>
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
                  <Link
                    href={`/clientes/${c.id}/cuenta`}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Ver cuenta
                  </Link>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Recordar el saldo por WhatsApp"
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Recordar 💬
                    </a>
                  )}
                  <Link
                    href={`/clientes?editar=${c.id}`}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </Link>
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
