import Link from "next/link";
import { db } from "@/lib/db";
import { ensureFondos } from "@/lib/seed";
import { formatMoney } from "@/lib/finance/money";
import { balanceEnergia } from "@/lib/finance/energia";
import { getAjusteNumero } from "@/lib/ajustes";
import { FondosChart, IngresosChart } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureFondos();

  const [inversiones, creditos, cierres, fondos, generaciones, consumos, precioKwhCents] = await Promise.all([
    db.inversion.findMany(),
    db.credito.findMany({ include: { cuotas: true } }),
    db.cierreCaja.findMany({ orderBy: { id: "asc" } }),
    db.fondo.findMany({ include: { regla: true, movimientos: true } }),
    db.energiaGeneracion.findMany(),
    db.medidorLectura.findMany(),
    getAjusteNumero("precioKwhCents", 0),
  ]);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Tablero</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen financiero del negocio de hielo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Total invertido" valor={formatMoney(totalInvertido)} color="text-slate-800" />
        <Kpi label="Saldo del crédito" valor={formatMoney(saldoCredito)} color="text-amber-600" extra={`${avance}% pagado`} />
        <Kpi label="Ingresos (cierres)" valor={formatMoney(ingresosTotales)} color="text-sky-700" />
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
