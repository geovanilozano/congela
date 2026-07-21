import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { costoPorBolsa, margenPorBolsa, puntoEquilibrio, recuperacionInversion, resumenPorMes } from "@/lib/finance/reportes";
import { FondosChart, IngresosChart, TendenciaChart } from "@/components/DashboardCharts";
import { ComparativoChart } from "@/components/ComparativoChart";
import { FiltroFecha } from "@/components/FiltroFecha";
import { rangoFechas } from "@/lib/fechas";
import { BotonImprimir } from "@/components/BotonImprimir";

// "AAAA-MM" -> "jul 2026"
function etiquetaMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
}

export const dynamic = "force-dynamic";

const CATEGORIAS = ["bolsas", "mantenimiento", "nomina", "transporte", "arriendo", "servicios", "reparaciones", "impuestos", "otro"];

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const rango = rangoFechas(sp);

  const hoy = new Date();
  // La tendencia y el comparativo solo muestran los últimos 6-12 meses: se acota el escaneo
  // de historia a ~13 meses en vez de traer TODA la venta/gasto desde el inicio del negocio.
  const desdeHistorial = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1);

  // Las sumas se piden agregadas a la base (aggregate/groupBy) en vez de traer las tablas
  // completas de ventas, gastos, ítems, producción y movimientos solo para reducirlas en JS.
  const [invAgg, gastosPorCat, produccionAgg, ventasAgg, ventaItemsAgg, ventasAllTimeAgg, gastosAllTimeAgg, cierres, ventasTodas, gastosTodos] = await Promise.all([
    db.inversion.aggregate({ _sum: { valorCents: true } }),
    db.compraGasto.groupBy({ by: ["categoria"], where: { fecha: rango }, _sum: { valorCents: true } }),
    db.produccion.aggregate({ where: { fecha: rango }, _sum: { bolsas: true } }),
    db.venta.aggregate({ where: { fecha: rango }, _sum: { totalCents: true } }),
    db.ventaItem.aggregate({ where: { venta: { fecha: rango } }, _sum: { cantidad: true } }),
    // Recuperación de la inversión: se usa la utilidad REAL acumulada de TODO el histórico
    // (ventas − gastos), no el saldo del fondo "Utilidad" (que ignoraba los gastos e inflaba el ROI).
    db.venta.aggregate({ _sum: { totalCents: true } }),
    db.compraGasto.aggregate({ _sum: { valorCents: true } }),
    db.cierreCaja.findMany({ orderBy: { id: "asc" } }),
    // Tendencia: ventas/gastos de los últimos ~13 meses (sin el filtro de fecha del usuario).
    db.venta.findMany({ where: { fecha: { gte: desdeHistorial } }, select: { fecha: true, totalCents: true } }),
    db.compraGasto.findMany({ where: { fecha: { gte: desdeHistorial } }, select: { fecha: true, valorCents: true } }),
  ]);

  const invertidoCents = invAgg._sum.valorCents ?? 0;
  const gastosCents = gastosPorCat.reduce((a, g) => a + (g._sum.valorCents ?? 0), 0);
  const bolsasProducidas = produccionAgg._sum.bolsas ?? 0;
  const bolsasVendidas = ventaItemsAgg._sum.cantidad ?? 0;
  const ingresosCents = ventasAgg._sum.totalCents ?? 0;
  // Utilidad REAL acumulada = todas las ventas del negocio − todos los gastos. Es la ganancia
  // honesta (antes se usaba el saldo del bolsillo "Utilidad", que no descontaba los gastos).
  const utilidadAcumuladaCents = (ventasAllTimeAgg._sum.totalCents ?? 0) - (gastosAllTimeAgg._sum.valorCents ?? 0);

  const precioPromedioCents = bolsasVendidas > 0 ? Math.round(ingresosCents / bolsasVendidas) : 0;
  const costoBolsaCents = costoPorBolsa(gastosCents, bolsasProducidas); // null si no hubo producción
  const margenCents = margenPorBolsa(precioPromedioCents, costoBolsaCents); // null si el costo es indefinido
  const puntoEq = puntoEquilibrio(gastosCents, margenCents);
  const roi = recuperacionInversion(invertidoCents, utilidadAcumuladaCents);
  // La barra nunca debe ir a ancho negativo (utilidad acumulada &lt; 0) ni pasar de 100%.
  const roiPct = Math.max(0, Math.min(100, roi.porcentaje));
  const utilidadNeta = ingresosCents - gastosCents;

  const gastosPorCategoria = CATEGORIAS
    .map((c) => ({ nombre: c, saldo: gastosPorCat.find((g) => g.categoria === c)?._sum.valorCents ?? 0 }))
    .filter((c) => c.saldo > 0);
  const ingresosData = cierres.map((c) => ({ label: `#${c.id}`, total: c.totalCents }));

  // Tendencia mes a mes para ver si el negocio va mejor o peor.
  const mesesTodos = resumenPorMes(ventasTodas, gastosTodos);
  const meses = mesesTodos.slice(-6); // últimos 6 meses para la tendencia y la tabla
  const tendenciaData = meses.map((m) => ({ mes: etiquetaMes(m.mes), ingresos: m.ingresosCents, gastos: m.gastosCents }));
  // Comparativo ingresos vs gastos (últimos 12 meses), dos barras por mes.
  const comparativoData = mesesTodos.slice(-12).map((m) => ({ mes: etiquetaMes(m.mes), ingresos: m.ingresosCents, gastos: m.gastosCents }));

  // Utilidad neta del MES ACTUAL (ingresos del mes − gastos del mes), en hora local.
  const claveMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mesActual = mesesTodos.find((m) => m.mes === claveMesActual);
  const ingresosMesCents = mesActual?.ingresosCents ?? 0;
  const gastosMesCents = mesActual?.gastosCents ?? 0;
  const utilidadMesCents = ingresosMesCents - gastosMesCents;
  const etiquetaMesActual = etiquetaMes(claveMesActual);
  // Comparación del último mes con el anterior.
  const ultimo = meses[meses.length - 1];
  const previo = meses[meses.length - 2];
  const variacionPct =
    ultimo && previo && previo.ingresosCents > 0
      ? Math.round(((ultimo.ingresosCents - previo.ingresosCents) / previo.ingresosCents) * 100)
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📈 Reportes financieros</h1>
          <p className="mt-1 text-sm text-slate-500">Indicadores para tomar decisiones del negocio.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2 text-sm">
          <BotonImprimir className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" />
          <a href="/api/export?tipo=ventas" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">⬇️ Ventas (Excel)</a>
          <a href="/api/export?tipo=gastos" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">⬇️ Gastos (Excel)</a>
        </div>
      </div>

      <FiltroFecha desde={sp.desde} hasta={sp.hasta} />

      {/* Recuperación de inversión */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Recuperación de la inversión</h2>
          {invertidoCents === 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">Sin inversión registrada</span>
          ) : roi.recuperado ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">✅ Inversión recuperada</span>
          ) : (
            <span className="text-sm text-slate-500">Falta {formatMoney(roi.faltanteCents)}</span>
          )}
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500" style={{ width: `${roiPct}%` }} />
        </div>
        <div className="mt-2 text-sm text-slate-500">
          {roiPct}% recuperado · Invertido {formatMoney(invertidoCents)} · Utilidad acumulada {formatMoney(utilidadAcumuladaCents)} <span className="text-slate-400">(ventas − gastos)</span>
        </div>
      </div>

      {/* Utilidad neta del mes actual */}
      <div className={`rounded-xl border p-5 shadow-sm ${utilidadMesCents >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Utilidad neta del mes</div>
            <div className="mt-1 text-sm capitalize text-slate-500">{etiquetaMesActual}</div>
            <div className={`mt-1 text-3xl font-bold ${utilidadMesCents >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatMoney(utilidadMesCents)}
            </div>
            <div className="mt-1 text-xs text-slate-500">Ingresos del mes − gastos del mes</div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-xs text-slate-500">Ingresos</div>
              <div className="mt-1 text-lg font-semibold text-emerald-600">{formatMoney(ingresosMesCents)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Gastos</div>
              <div className="mt-1 text-lg font-semibold text-red-600">{formatMoney(gastosMesCents)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores clave */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Costo real por bolsa"
          valor={costoBolsaCents === null ? "—" : formatMoney(costoBolsaCents)}
          extra={costoBolsaCents === null ? "sin producción en el rango" : `${bolsasProducidas} bolsas producidas`}
        />
        <Kpi label="Precio promedio de venta" valor={formatMoney(precioPromedioCents)} extra={`${bolsasVendidas} bolsas vendidas`} />
        <Kpi
          label="Margen por bolsa"
          valor={margenCents === null ? "—" : formatMoney(margenCents)}
          color={margenCents === null ? undefined : margenCents >= 0 ? "text-emerald-600" : "text-red-600"}
        />
        <Kpi
          label="Punto de equilibrio"
          valor={puntoEq === null ? "—" : `${puntoEq} bolsas`}
          extra={puntoEq === null ? "El margen no es positivo" : "para cubrir los gastos"}
        />
        <Kpi label="Ingresos totales" valor={formatMoney(ingresosCents)} color="text-sky-700" />
        <Kpi label="Gastos totales" valor={formatMoney(gastosCents)} color="text-red-600" />
        <Kpi label="Utilidad neta" valor={formatMoney(utilidadNeta)} color={utilidadNeta >= 0 ? "text-emerald-600" : "text-red-600"} extra="ingresos − gastos" />
        <Kpi label="Total invertido" valor={formatMoney(invertidoCents)} />
      </div>

      {/* Tendencia mes a mes */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-600">Tendencia mes a mes (ingresos vs gastos)</h2>
          {variacionPct !== null && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${variacionPct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              Ventas del último mes {variacionPct >= 0 ? "▲" : "▼"} {Math.abs(variacionPct)}% vs el mes anterior
            </span>
          )}
        </div>
        <TendenciaChart data={tendenciaData} />
        {meses.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Mes</th>
                  <th className="text-right">Ingresos</th>
                  <th className="text-right">Gastos</th>
                  <th className="text-right">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr key={m.mes} className="border-t border-slate-100">
                    <td className="py-1.5 capitalize">{etiquetaMes(m.mes)}</td>
                    <td className="text-right text-emerald-600">{formatMoney(m.ingresosCents)}</td>
                    <td className="text-right text-red-600">{formatMoney(m.gastosCents)}</td>
                    <td className={`text-right font-medium ${m.utilidadCents >= 0 ? "text-slate-800" : "text-red-600"}`}>{formatMoney(m.utilidadCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ingresos vs Gastos por mes */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Ingresos vs Gastos por mes</h2>
        <p className="mb-3 text-xs text-slate-400">Comparativo de los últimos 12 meses: barra azul = ingresos de ventas, barra roja = gastos.</p>
        <ComparativoChart data={comparativoData} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Ingresos por cierre de caja</h2>
          <IngresosChart data={ingresosData} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Gastos por categoría</h2>
          <FondosChart data={gastosPorCategoria} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, valor, color = "text-slate-800", extra }: { label: string; valor: string; color?: string; extra?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{valor}</div>
      {extra && <div className="mt-0.5 text-xs text-slate-400">{extra}</div>}
    </div>
  );
}
