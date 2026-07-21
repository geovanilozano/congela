import Link from "next/link";
import { db } from "@/lib/db";
import { ensureFondos } from "@/lib/seed";
import { formatMoney } from "@/lib/finance/money";
import { balanceEnergia } from "@/lib/finance/energia";
import { estadoCuota } from "@/lib/finance/cuotas";
import { estadoMantenimiento } from "@/lib/mantenimiento";
import { bajoStock } from "@/lib/inventario";
import { getAjusteNumero } from "@/lib/ajustes";
import { FONDO_INGRESO_ENERGIA } from "@/lib/seed";
import { fechaParaInput } from "@/lib/fechas";
import { FondosChart, IngresosChart } from "@/components/DashboardCharts";
import { VentasRecientesChart } from "@/components/VentasRecientesChart";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureFondos();

  // Ventana de los últimos 14 días (hoy incluido), en hora local del negocio.
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicio14 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 13);

  // Las sumas se piden a la base con aggregate/groupBy en vez de traer tablas enteras solo
  // para sumarlas en JS: gastos, energía y movimientos de fondos crecen a diario y esto es
  // el tablero (se carga en cada visita).
  const [invAgg, creditos, cierres, fondos, saldosFondo, genAgg, consAgg, precioKwhCents, gastoAgg, ventasTotalAgg, energiaAgg, insumos, productos, mantenimientos, ventasPendientes, fiadoPorCobrar, ventasRecientes] = await Promise.all([
    db.inversion.aggregate({ _sum: { valorCents: true }, _count: true }),
    db.credito.findMany({ include: { cuotas: true } }),
    db.cierreCaja.findMany({ orderBy: { id: "asc" } }),
    db.fondo.findMany({ include: { regla: true } }),
    db.movimientoFondo.groupBy({ by: ["fondoId"], _sum: { montoCents: true } }),
    db.energiaGeneracion.aggregate({ _sum: { kwh: true } }),
    db.medidorLectura.aggregate({ _sum: { kwh: true } }),
    getAjusteNumero("precioKwhCents", 0),
    db.compraGasto.aggregate({ _sum: { valorCents: true }, _count: true }),
    db.venta.aggregate({ _sum: { totalCents: true } }), // ingresos de TODAS las ventas (histórico)
    db.movimientoFondo.aggregate({ where: { fondo: { nombre: FONDO_INGRESO_ENERGIA } }, _sum: { montoCents: true } }), // cobro de energía a inquilinos
    db.insumoInventario.findMany(),
    db.producto.findMany({ where: { activo: true }, select: { nombre: true, stock: true, stockMinimo: true } }),
    db.mantenimiento.findMany(),
    db.venta.findMany({ where: { cierreId: null }, select: { totalCents: true } }),
    db.venta.findMany({ where: { formaPago: "credito", pagada: false }, select: { clienteId: true, totalCents: true } }),
    db.venta.findMany({ where: { fecha: { gte: inicio14 } }, select: { fecha: true, totalCents: true } }),
  ]);

  const totalGastos = gastoAgg._sum.valorCents ?? 0;
  // Ingresos = ventas de hielo + cobro de energía revendida a inquilinos.
  const ingresosCents = (ventasTotalAgg._sum.totalCents ?? 0) + (energiaAgg._sum.montoCents ?? 0);

  const balEnergia = balanceEnergia({
    generacionKwh: genAgg._sum.kwh ?? 0,
    consumoKwh: consAgg._sum.kwh ?? 0,
    precioKwhCents,
  });

  const totalInvertido = invAgg._sum.valorCents ?? 0;

  // Crédito: lo que falta por pagar y el avance, según lo abonado (soporta pagos parciales).
  const todasCuotas = creditos.flatMap((c) => c.cuotas);
  const totalCredito = todasCuotas.reduce((a, q) => a + q.cuotaCents, 0);
  const totalAbonado = todasCuotas.reduce((a, q) => a + q.abonadoCents, 0);
  const saldoCredito = totalCredito - totalAbonado;
  const avance = totalCredito > 0 ? Math.round((totalAbonado / totalCredito) * 100) : 0;

  // Saldo de cada fondo = suma de sus movimientos (una sola consulta agregada por fondoId).
  const saldoPorFondoId = new Map(saldosFondo.map((g) => [g.fondoId, g._sum.montoCents ?? 0]));

  // Utilidad REAL acumulada = ingresos (ventas + energía revendida) − todos los gastos (la
  // ganancia honesta). Antes se mostraba el saldo del bolsillo "Utilidad", que no descuenta gastos.
  const utilidad = ingresosCents - totalGastos;

  // Proyección: cuánto pasará a utilidad cuando se pague el crédito.
  const fondoCredito = fondos.find((f) => f.nombre === "Crédito");
  const cuotaActiva = fondoCredito?.regla?.activo ? (fondoCredito.regla.valorCents ?? 0) : 0;

  const fondosData = fondos.map((f) => ({
    nombre: f.nombre,
    saldo: saldoPorFondoId.get(f.id) ?? 0,
  }));
  const ingresosData = cierres.map((c) => ({
    label: new Date(c.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
    total: c.totalCents,
  }));

  // Ventas totales por día de los últimos 14 días (clave AAAA-MM-DD local).
  // Se siembran los 14 días en cero para no dejar huecos en la gráfica.
  const ventasPorDia = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - i);
    ventasPorDia.set(fechaParaInput(d), 0);
  }
  for (const v of ventasRecientes) {
    const clave = fechaParaInput(v.fecha);
    if (ventasPorDia.has(clave)) ventasPorDia.set(clave, (ventasPorDia.get(clave) ?? 0) + v.totalCents);
  }
  const ventasRecientesData = [...ventasPorDia.entries()].map(([clave, total]) => {
    const [a, m, dia] = clave.split("-").map(Number);
    return {
      label: new Date(a, m - 1, dia).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
      total,
    };
  });
  const ventasHoyCents = ventasPorDia.get(fechaParaInput(inicioHoy)) ?? 0;

  // ¿La base está prácticamente vacía? Mostrar una guía de primeros pasos.
  const sinDatos =
    invAgg._count === 0 &&
    creditos.length === 0 &&
    cierres.length === 0 &&
    gastoAgg._count === 0 &&
    insumos.length === 0;

  // Centro de alertas: cuotas del crédito, inventario, mantenimiento y cierre de caja.
  const hoy = new Date();
  const cuotasVencidas = todasCuotas.filter((q) => estadoCuota(q, hoy) === "vencida");
  const cuotasProximas = todasCuotas.filter((q) => estadoCuota(q, hoy) === "proxima");
  const insumosBajos = bajoStock(insumos);
  // Producto vendido de más (stock negativo) vs producto con stock bajo (0..mínimo).
  const productosNegativos = productos.filter((p) => p.stock < 0);
  const productosBajos = productos.filter((p) => p.stock >= 0 && p.stockMinimo > 0 && p.stock <= p.stockMinimo);
  const mantVencidos = mantenimientos.filter((m) => estadoMantenimiento(m, hoy) === "vencido").length;
  const mantProximos = mantenimientos.filter((m) => estadoMantenimiento(m, hoy) === "proximo").length;

  // Detalle de las cuotas vencidas: cuánto se debe y hace cuántos días vence la más vieja.
  // Lo realmente vencido descuenta lo ya abonado a cada cuota (soporta pagos parciales).
  const montoVencidoCents = cuotasVencidas.reduce((a, q) => a + (q.cuotaCents - q.abonadoCents), 0);
  const masVieja = cuotasVencidas.reduce<Date | null>(
    (min, q) => (min === null || q.fechaVencimiento < min ? q.fechaVencimiento : min),
    null,
  );
  const diasMora = masVieja ? Math.floor((hoy.getTime() - masVieja.getTime()) / 86_400_000) : 0;

  // Ventas del día sin cerrar: recordar cerrar la caja (es el paso que reparte el dinero).
  const pendientesCents = ventasPendientes.reduce((a, v) => a + v.totalCents, 0);

  // Fiado por cobrar: cuánto te deben y cuántos clientes.
  const totalFiadoCents = fiadoPorCobrar.reduce((a, v) => a + v.totalCents, 0);
  const clientesQueDeben = new Set(fiadoPorCobrar.filter((v) => v.clienteId != null).map((v) => v.clienteId)).size;

  const alertas: { nivel: "alta" | "media"; texto: string; href: string }[] = [];
  if (cuotasVencidas.length > 0)
    alertas.push({
      nivel: "alta",
      texto: `${cuotasVencidas.length} cuota(s) vencida(s) por ${formatMoney(montoVencidoCents)}${diasMora > 0 ? ` · la más vieja hace ${diasMora} día(s)` : ""}`,
      href: "/credito",
    });
  if (cuotasProximas.length > 0) alertas.push({ nivel: "media", texto: `${cuotasProximas.length} cuota(s) del crédito por vencer`, href: "/credito" });
  if (mantVencidos > 0) alertas.push({ nivel: "alta", texto: `${mantVencidos} mantenimiento(s) vencido(s)`, href: "/mantenimiento" });
  if (pendientesCents > 0) alertas.push({ nivel: "media", texto: `Tienes ${formatMoney(pendientesCents)} en ventas sin cerrar — recuerda cerrar la caja`, href: "/caja" });
  if (totalFiadoCents > 0) alertas.push({ nivel: "media", texto: `Te deben ${formatMoney(totalFiadoCents)} en fiado${clientesQueDeben > 0 ? ` (${clientesQueDeben} cliente(s))` : ""} — recuérdales por WhatsApp`, href: "/clientes" });
  if (insumosBajos.length > 0) alertas.push({ nivel: "media", texto: `${insumosBajos.length} insumo(s) con bajo stock: ${insumosBajos.map((i) => i.nombre).join(", ")}`, href: "/inventario" });
  if (productosNegativos.length > 0) alertas.push({ nivel: "alta", texto: `Vendiste más de lo producido de: ${productosNegativos.map((p) => p.nombre).join(", ")}`, href: "/productos" });
  if (productosBajos.length > 0) alertas.push({ nivel: "media", texto: `${productosBajos.length} producto(s) con stock bajo: ${productosBajos.map((p) => p.nombre).join(", ")}`, href: "/productos" });
  if (mantProximos > 0) alertas.push({ nivel: "media", texto: `${mantProximos} mantenimiento(s) próximo(s)`, href: "/mantenimiento" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Tablero</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen financiero del negocio de hielo.</p>
      </div>

      {/* Guía de primeros pasos (cuando la base está vacía) */}
      {sinDatos && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-800">👋 ¡Bienvenido! Primeros pasos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Para empezar a llevar el control del negocio, te recomendamos este orden:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { href: "/ajustes", icon: "🏢", n: "1", t: "Datos del negocio", d: "Nombre y NIT: salen en tus facturas" },
              { href: "/fondos", icon: "🪙", n: "2", t: "Arma tus bolsillos", d: "Arriendo, crédito, reserva y utilidad" },
              { href: "/energia", icon: "⚡", n: "3", t: "Precio del kWh", d: "Para calcular el ahorro de los paneles" },
              { href: "/credito", icon: "💳", n: "4", t: "Registra el crédito", d: "El préstamo con que pagas los equipos" },
              { href: "/activos", icon: "🧰", n: "5", t: "Carga tus equipos", d: "Refrigeradores y cubeteros (se suman a la inversión)" },
              { href: "/ventas", icon: "🧾", n: "6", t: "Registra las ventas", d: "Y cierra la caja para repartir el dinero" },
            ].map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700">{p.n}</span>
                  <span className="text-lg">{p.icon}</span>
                </div>
                <div className="mt-2 font-medium text-slate-800 group-hover:text-sky-700">{p.t}</div>
                <div className="mt-0.5 text-xs text-slate-500">{p.d}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Centro de alertas */}
      {alertas.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600">🔔 Alertas ({alertas.length})</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {alertas.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition hover:shadow-sm ${
                  a.nivel === "alta"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <span>{a.nivel === "alta" ? "⚠️" : "🔔"}</span>
                <span>{a.texto}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          ✅ Todo al día: sin cuotas vencidas, stock suficiente y mantenimientos al corriente.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Ventas de hoy" valor={formatMoney(ventasHoyCents)} color="text-sky-700" />
        <Kpi label="Total invertido" valor={formatMoney(totalInvertido)} color="text-slate-800" />
        <Kpi label="Saldo del crédito" valor={formatMoney(saldoCredito)} color="text-amber-600" extra={`${avance}% pagado`} />
        <Kpi label="Ingresos" valor={formatMoney(ingresosCents)} color="text-sky-700" extra="ventas + energía revendida" />
        <Kpi label="Gastos registrados" valor={formatMoney(totalGastos)} color="text-red-600" />
        <Kpi label="Utilidad acumulada" valor={formatMoney(utilidad)} color={utilidad >= 0 ? "text-emerald-600" : "text-red-600"} extra="ventas − gastos" />
        <Kpi label="Ahorro solar" valor={formatMoney(balEnergia.ahorroCents)} color="text-amber-500" extra={`${balEnergia.porcentajeSolar}% con paneles`} />
      </div>

      {cuotaActiva > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          💡 Cuando termines de pagar el crédito, los <b>{formatMoney(cuotaActiva)}</b> que hoy
          se apartan para la cuota pasarán automáticamente a tu <b>bolsillo de Utilidad</b>.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Ingresos por cierre de caja</h2>
          <IngresosChart data={ingresosData} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Saldo de cada fondo</h2>
          <FondosChart data={fondosData} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Ventas de los últimos 14 días</h2>
        <VentasRecientesChart data={ventasRecientesData} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/ventas" className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700">
          + Registrar venta
        </Link>
        <Link href="/caja" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
          Cerrar caja
        </Link>
        <Link href="/credito" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
          Ver crédito
        </Link>
      </div>
    </div>
  );
}

function Kpi({ label, valor, color, extra }: { label: string; valor: string; color: string; extra?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{valor}</div>
      {extra && <div className="mt-0.5 text-xs text-slate-400">{extra}</div>}
    </div>
  );
}
