// Arma un resumen compacto y en texto del estado del negocio, para dárselo al
// asistente de IA como contexto. Claude responde SOLO con base en este resumen; nunca
// consulta la base de datos directamente. Así el costo y el alcance quedan acotados.
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";

export async function resumenNegocio(): Promise<string> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hace7 = new Date(inicioHoy);
  hace7.setDate(hace7.getDate() - 6);
  // Se traen las ventas desde el más antiguo de {inicio de mes, hace 7 días} para poder
  // calcular hoy / semana / mes con una sola consulta.
  const desdeVentas = inicioMes < hace7 ? inicioMes : hace7;

  const [ventasRecientes, porCobrar, clientes, fondos, saldosPorFondo, insumos, gastosMes, produccionMes] =
    await Promise.all([
      db.venta.findMany({
        where: { fecha: { gte: desdeVentas } },
        select: { fecha: true, totalCents: true },
      }),
      db.venta.findMany({
        where: { formaPago: "credito", pagada: false },
        select: { clienteId: true, totalCents: true },
      }),
      db.cliente.findMany({ select: { id: true, nombre: true } }),
      db.fondo.findMany({ select: { id: true, nombre: true } }),
      // Saldo de cada fondo con un groupBy en la BD, en vez de traer TODOS sus movimientos
      // (movimientoFondo es la tabla que más crece: una fila por fondo en cada cierre).
      db.movimientoFondo.groupBy({ by: ["fondoId"], _sum: { montoCents: true } }),
      db.insumoInventario.findMany({ select: { nombre: true, stock: true, stockMinimo: true, unidad: true } }),
      db.compraGasto.findMany({ where: { fecha: { gte: inicioMes } }, select: { valorCents: true } }),
      db.produccion.findMany({ where: { fecha: { gte: inicioMes } }, select: { bolsas: true } }),
    ]);

  // Ventas por periodo.
  const sumar = (arr: { totalCents: number }[]) => arr.reduce((a, v) => a + v.totalCents, 0);
  const ventasHoy = ventasRecientes.filter((v) => v.fecha >= inicioHoy);
  const ventasSemana = ventasRecientes.filter((v) => v.fecha >= hace7);
  const ventasMes = ventasRecientes.filter((v) => v.fecha >= inicioMes);

  // Cuentas por cobrar y mayores deudores.
  const nombrePorId = new Map(clientes.map((c) => [c.id, c.nombre]));
  const deudaPorCliente = new Map<number, number>();
  for (const v of porCobrar) {
    if (v.clienteId == null) continue;
    deudaPorCliente.set(v.clienteId, (deudaPorCliente.get(v.clienteId) ?? 0) + v.totalCents);
  }
  const totalPorCobrar = sumar(porCobrar);
  const topDeudores = [...deudaPorCliente.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, cents]) => `${nombrePorId.get(id) ?? "Cliente #" + id}: ${formatMoney(cents)}`);

  // Saldos de fondos (desde el groupBy: saldo = suma de movimientos por fondoId).
  const saldoDe = new Map(saldosPorFondo.map((g) => [g.fondoId, g._sum.montoCents ?? 0]));
  const saldosFondos = fondos.map((f) => `${f.nombre}: ${formatMoney(saldoDe.get(f.id) ?? 0)}`);

  // Inventario bajo mínimo.
  const stockBajo = insumos
    .filter((i) => i.stock <= i.stockMinimo)
    .map((i) => `${i.nombre}: ${i.stock} ${i.unidad} (mínimo ${i.stockMinimo})`);

  const gastosMesCents = gastosMes.reduce((a, g) => a + g.valorCents, 0);
  const bolsasMes = produccionMes.reduce((a, p) => a + p.bolsas, 0);
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

  return [
    `RESUMEN DEL NEGOCIO CONGELA (producción y venta de hielo). Fecha de hoy: ${fecha}.`,
    "",
    "VENTAS",
    `- Hoy: ${formatMoney(sumar(ventasHoy))} (${ventasHoy.length} ventas)`,
    `- Últimos 7 días: ${formatMoney(sumar(ventasSemana))} (${ventasSemana.length} ventas)`,
    `- Este mes: ${formatMoney(sumar(ventasMes))} (${ventasMes.length} ventas)`,
    "",
    "CUENTAS POR COBRAR (fiado sin pagar)",
    `- Total por cobrar: ${formatMoney(totalPorCobrar)}`,
    topDeudores.length ? `- Mayores deudores: ${topDeudores.join(" · ")}` : "- Nadie te debe fiado ahora mismo.",
    "",
    "FONDOS (saldos actuales)",
    saldosFondos.length ? "- " + saldosFondos.join(" · ") : "- Sin fondos configurados.",
    "",
    `GASTOS DEL MES: ${formatMoney(gastosMesCents)}`,
    `PRODUCCIÓN DEL MES: ${bolsasMes} bolsas`,
    "",
    "INVENTARIO",
    stockBajo.length
      ? "- Insumos por debajo del mínimo: " + stockBajo.join(" · ")
      : "- Todo el inventario está por encima del mínimo.",
  ].join("\n");
}
