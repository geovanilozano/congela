import { db } from "@/lib/db";
import { formatMoney, fromCents } from "@/lib/finance/money";
import { balanceEnergia } from "@/lib/finance/energia";
import { getAjusteNumero } from "@/lib/ajustes";
import { guardarPrecioKwh, registrarGeneracion, registrarConsumo } from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function EnergiaPage() {
  const [generaciones, consumos, precioKwhCents] = await Promise.all([
    db.energiaGeneracion.findMany({ orderBy: { fecha: "desc" } }),
    db.medidorLectura.findMany({ orderBy: { fecha: "desc" } }),
    getAjusteNumero("precioKwhCents", 0),
  ]);

  const totalGen = generaciones.reduce((a, g) => a + g.kwh, 0);
  const totalCons = consumos.reduce((a, c) => a + c.kwh, 0);
  const bal = balanceEnergia({ generacionKwh: totalGen, consumoKwh: totalCons, precioKwhCents });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">⚡ Energía (paneles vs consumo)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra cuánta energía generan los paneles y cuánta consume la empresa. El sistema
          calcula el ahorro y cuánto tocaría pagarle a la red.
          {precioKwhCents === 0 && " Primero define el precio del kWh abajo."}
        </p>
      </div>

      {/* Indicadores de balance */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Generado (paneles)" valor={`${totalGen.toFixed(1)} kWh`} color="text-amber-600" />
        <Kpi label="Consumido" valor={`${totalCons.toFixed(1)} kWh`} color="text-slate-800" />
        <Kpi label="Ahorro solar" valor={formatMoney(bal.ahorroCents)} color="text-emerald-600" extra={`${bal.porcentajeSolar}% del consumo`} />
        <Kpi label="A pagar a la red" valor={formatMoney(bal.costoRedCents)} color="text-sky-700" extra={`${bal.redKwh.toFixed(1)} kWh de red`} />
      </div>

      {/* Precio del kWh */}
      <form action={guardarPrecioKwh} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="text-slate-500">Precio del kWh ($)</span>
          <input name="precioPesos" type="number" min="0" step="1" defaultValue={precioKwhCents ? fromCents(precioKwhCents) : ""} className="mt-1 w-40 rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">Guardar precio</BotonGuardar>
      </form>

      {/* Registrar generación y consumo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={registrarGeneracion} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-amber-600">☀️ Registrar generación de paneles</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-slate-500">Energía generada (kWh)</span>
              <input name="kwh" type="number" min="0" step="0.1" required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="text-slate-500">Fecha</span>
              <input name="fecha" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
          </div>
          <BotonGuardar className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600">Guardar generación</BotonGuardar>
        </form>

        <form action={registrarConsumo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-sky-700">🔌 Registrar consumo (medidor)</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-slate-500">Energía consumida (kWh)</span>
              <input name="kwh" type="number" min="0" step="0.1" required className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="text-slate-500">Fecha</span>
              <input name="fecha" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
          </div>
          <BotonGuardar className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">Guardar consumo</BotonGuardar>
        </form>
      </div>

      {/* Historial */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Historial titulo="Generación de paneles" datos={generaciones} unidad="kWh" color="text-amber-600" fmtFecha={fmtFecha} />
        <Historial titulo="Consumo de la empresa" datos={consumos} unidad="kWh" color="text-sky-700" fmtFecha={fmtFecha} />
      </div>
    </div>
  );
}

function Kpi({ label, valor, color, extra }: { label: string; valor: string; color: string; extra?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{valor}</div>
      {extra && <div className="mt-0.5 text-xs text-slate-400">{extra}</div>}
    </div>
  );
}

function Historial({
  titulo,
  datos,
  unidad,
  color,
  fmtFecha,
}: {
  titulo: string;
  datos: { id: number; fecha: Date; kwh: number }[];
  unidad: string;
  color: string;
  fmtFecha: (d: Date) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-600">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin registros aún.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {datos.slice(0, 8).map((d) => (
            <li key={d.id} className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">{fmtFecha(d.fecha)}</span>
              <span className={`font-medium ${color}`}>{d.kwh.toFixed(1)} {unidad}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
