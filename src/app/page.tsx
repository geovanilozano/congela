import Link from "next/link";
import { db } from "@/lib/db";
import { ensureFondos } from "@/lib/seed";
import { formatMoney } from "@/lib/finance/money";
import { balanceEnergia } from "@/lib/finance/energia";
import { estadoCuota } from "@/lib/finance/cuotas";
import { estadoMantenimiento } from "@/lib/mantenimiento";
import { bajoStock } from "@/lib/inventario";
import { getAjusteNumero } from "@/lib/ajustes";
import { FondosChart, IngresosChart } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureFondos();

  const [inversiones, creditos, cierres, fondos, generaciones, consumos, precioKwhCents, gastos, insumos, mantenimientos] = await Promise.all([
    db.inversion.findMany(),
    db.credito.findMany({ include: { cuotas: true } }),
    db.cierreCaja.findMany({ orderBy: { id: "asc" } }),
    db.fondo.findMany({ include: { regla: true, movimientos: true } }),
    db.energiaGeneracion.findMany(),
    db.medidorLectura.findMany(),
    getAjusteNumero("precioKwhCents", 0),
    db.compraGasto.findMany(),
    db.insumoInventario.findMany(),
    db.mantenimiento.findMany(),
  ]);

  const totalGastos = gastos.reduce((a, g) => a + g.valorCents, 0);

  const balEnergia = balanceEnergia({
    generacionKwh: generaciones.reduce((a, g) => a + g.kwh, 0),
    consumoKwh: consumos.reduce((a, c) => a + c.kwh, 0),
    precioKwhCents,
  });

  const totalInvertido = inversiones.reduce((a, i) => a + i.valorCents, 0);
  const ingresosTotales = cierres.reduce((a, c) => a + c.totalCents, 0);

  // Crédito: saldo pendiente y avance sobre todos los créditos.
  const todasCuotas = creditos.flatMap((c) => c.cuotas);
  const saldoCredito = todasCuotas.filter((q) => q.estado !== "pagada").reduce((a, q) => a + q.capitalCents, 0);
  const pagadas = todasCuotas.filter((q) => q.estado === "pagada").length;
  const avance = todasCuotas.length ? Math.round((pagadas / todasCuotas.length) * 100) : 0;

  const saldoFondo = (nombre: string) =>
    fondos.find((f) => f.nombre === nombre)?.movimientos.reduce((a, m) => a + m.montoCents, 0) ?? 0;
  const utilidad = saldoFondo("Utilidad");

  // Proyección: cuánto pasará a utilidad cuando se pague el crédito.
  const fondoCredito = fondos.find((f) => f.nombre === "Crédito");
  const cuotaActiva = fondoCredito?.regla?.activo ? (fondoCredito.regla.valorCents ?? 0) : 0;

  const fondosData = fondos.map((f) => ({
    nombre: f.nombre,
    saldo: f.movimientos.reduce((a, m) => a + m.montoCents, 0),
  }));
  const ingresosData = cierres.map((c) => ({ label: `#${c.id}`, total: c.totalCents }));

  // Centro de alertas: cuotas del crédito, inventario y mantenimiento.
  const hoy = new Date();
  const todasLasCuotas = creditos.flatMap((c) => c.cuotas);
  const cuotasVencidas = todasLasCuotas.filter((q) => estadoCuota(q, hoy) === "vencida").length;
  const cuotasProximas = todasLasCuotas.filter((q) => estadoCuota(q, hoy) === "proxima").length;
  const insumosBajos = bajoStock(insumos);
  const mantVencidos = mantenimientos.filter((m) => estadoMantenimiento(m, hoy) === "vencido").length;
  const mantProximos = mantenimientos.filter((m) => estadoMantenimiento(m, hoy) === "proximo").length;

  const alertas: { nivel: "alta" | "media"; texto: string; href: string }[] = [];
  if (cuotasVencidas > 0) alertas.push({ nivel: "alta", texto: `${cuotasVencidas} cuota(s) del crédito vencida(s)`, href: "/credito" });
  if (cuotasProximas > 0) alertas.push({ nivel: "media", texto: `${cuotasProximas} cuota(s) del crédito por vencer`, href: "/credito" });
  if (mantVencidos > 0) alertas.push({ nivel: "alta", texto: `${mantVencidos} mantenimiento(s) vencido(s)`, href: "/mantenimiento" });
  if (insumosBajos.length > 0) alertas.push({ nivel: "media", texto: `${insumosBajos.length} insumo(s) con bajo stock: ${insumosBajos.map((i) => i.nombre).join(", ")}`, href: "/inventario" });
  if (mantProximos > 0) alertas.push({ nivel: "media", texto: `${mantProximos} mantenimiento(s) próximo(s)`, href: "/mantenimiento" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Tablero</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen financiero del negocio de hielo.</p>
      </div>

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
        <Kpi label="Total invertido" valor={formatMoney(totalInvertido)} color="text-slate-800" />
        <Kpi label="Saldo del crédito" valor={formatMoney(saldoCredito)} color="text-amber-600" extra={`${avance}% pagado`} />
        <Kpi label="Ingresos (cierres)" valor={formatMoney(ingresosTotales)} color="text-sky-700" />
        <Kpi label="Gastos registrados" valor={formatMoney(totalGastos)} color="text-red-600" />
        <Kpi label="Utilidad acumulada" valor={formatMoney(utilidad)} color="text-emerald-600" />
        <Kpi label="Ahorro solar" valor={formatMoney(balEnergia.ahorroCents)} color="text-amber-500" extra={`${balEnergia.porcentajeSolar}% con paneles`} />
      </div>

      {cuotaActiva > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          💡 Cuando termines de pagar el crédito, los <b>{formatMoney(cuotaActiva)}</b> que hoy
          se apartan para la cuota pasarán automáticamente a tu <b>utilidad</b>.
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
