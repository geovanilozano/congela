import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance/money";
import { costoPorBolsa, margenPorBolsa, puntoEquilibrio, recuperacionInversion } from "@/lib/finance/reportes";
import { FondosChart, IngresosChart } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

const CATEGORIAS = ["bolsas", "mantenimiento", "nomina", "transporte", "arriendo", "servicios", "reparaciones", "impuestos", "otro"];

export default async function ReportesPage() {
  const [inversiones, gastos, producciones, ventas, ventaItems, fondos, cierres] = await Promise.all([
    db.inversion.findMany(),
    db.compraGasto.findMany(),
    db.produccion.findMany(),
    db.venta.findMany(),
    db.ventaItem.findMany(),
    db.fondo.findMany({ include: { movimientos: true } }),
    db.cierreCaja.findMany({ orderBy: { id: "asc" } }),
  ]);

  const invertidoCents = inversiones.reduce((a, i) => a + i.valorCents, 0);
  const gastosCents = gastos.reduce((a, g) => a + g.valorCents, 0);
  const bolsasProducidas = producciones.reduce((a, p) => a + p.bolsas, 0);
  const bolsasVendidas = ventaItems.reduce((a, v) => a + v.cantidad, 0);
  const ingresosCents = ventas.reduce((a, v) => a + v.totalCents, 0);
  const utilidadCents = fondos.find((f) => f.nombre === "Utilidad")?.movimientos.reduce((a, m) => a + m.montoCents, 0) ?? 0;

  const precioPromedioCents = bolsasVendidas > 0 ? Math.round(ingresosCents / bolsasVendidas) : 0;
  const costoBolsaCents = costoPorBolsa(gastosCents, bolsasProducidas);
  const margenCents = margenPorBolsa(precioPromedioCents, costoBolsaCents);
  const puntoEq = puntoEquilibrio(gastosCents, margenCents);
  const roi = recuperacionInversion(invertidoCents, utilidadCents);
  const utilidadNeta = ingresosCents - gastosCents;

  const gastosPorCategoria = CATEGORIAS
    .map((c) => ({ nombre: c, saldo: gastos.filter((g) => g.categoria === c).reduce((a, g) => a + g.valorCents, 0) }))
    .filter((c) => c.saldo > 0);
  const ingresosData = cierres.map((c) => ({ label: `#${c.id}`, total: c.totalCents }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📈 Reportes financieros</h1>
          <p className="mt-1 text-sm text-slate-500">Indicadores para tomar decisiones del negocio.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href="/api/export?tipo=ventas" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">⬇️ Ventas (Excel)</a>
          <a href="/api/export?tipo=gastos" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">⬇️ Gastos (Excel)</a>
        </div>
      </div>

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
          <div className="h-full bg-emerald-500" style={{ width: `${roi.porcentaje}%` }} />
        </div>
        <div className="mt-2 text-sm text-slate-500">
          {roi.porcentaje}% recuperado · Invertido {formatMoney(invertidoCents)} · Utilidad acumulada {formatMoney(utilidadCents)}
        </div>
      </div>

      {/* Indicadores clave */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Costo real por bolsa" valor={formatMoney(costoBolsaCents)} extra={`${bolsasProducidas} bolsas producidas`} />
        <Kpi label="Precio promedio de venta" valor={formatMoney(precioPromedioCents)} extra={`${bolsasVendidas} bolsas vendidas`} />
        <Kpi label="Margen por bolsa" valor={formatMoney(margenCents)} color={margenCents >= 0 ? "text-emerald-600" : "text-red-600"} />
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
