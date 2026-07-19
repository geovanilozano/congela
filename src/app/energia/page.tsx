import { db } from "@/lib/db";
import { formatMoney, fromCents, round2 } from "@/lib/finance/money";
import { balanceEnergia } from "@/lib/finance/energia";
import { fechaParaInput } from "@/lib/fechas";
import { getAjusteNumero, getAjuste } from "@/lib/ajustes";
import { EnergiaChart, type PuntoEnergia } from "@/components/EnergiaChart";
import {
  guardarPrecioKwh,
  registrarGeneracion,
  registrarConsumo,
  guardarCredencialesGrowatt,
  sincronizarGrowattAccion,
} from "./actions";
import { BotonGuardar } from "@/components/BotonGuardar";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function EnergiaPage() {
  const [generaciones, consumos, precioKwhCents, growattUsuario, growattMsg] = await Promise.all([
    db.energiaGeneracion.findMany({ orderBy: { fecha: "desc" } }),
    db.medidorLectura.findMany({ orderBy: { fecha: "desc" } }),
    getAjusteNumero("precioKwhCents", 0),
    getAjuste("growattUsuario"),
    getAjuste("growattMsg"),
  ]);

  const totalGen = generaciones.reduce((a, g) => a + g.kwh, 0);
  const totalCons = consumos.reduce((a, c) => a + c.kwh, 0);
  const bal = balanceEnergia({ generacionKwh: totalGen, consumoKwh: totalCons, precioKwhCents });

  // --- Ahorro solar del MES en curso ---
  const ahora = new Date();
  const mismoMes = (d: Date) =>
    d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
  const genMes = generaciones.filter((g) => mismoMes(g.fecha)).reduce((a, g) => a + g.kwh, 0);
  const consMes = consumos.filter((c) => mismoMes(c.fecha)).reduce((a, c) => a + c.kwh, 0);
  const balMes = balanceEnergia({ generacionKwh: genMes, consumoKwh: consMes, precioKwhCents });
  const nombreMes = ahora.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  // --- Serie diaria para la gráfica: generación vs consumo ---
  const porDia = new Map<string, { gen: number; cons: number; fecha: Date }>();
  for (const g of generaciones) {
    const key = fechaParaInput(g.fecha);
    const prev = porDia.get(key) ?? { gen: 0, cons: 0, fecha: g.fecha };
    prev.gen += g.kwh;
    porDia.set(key, prev);
  }
  for (const c of consumos) {
    const key = fechaParaInput(c.fecha);
    const prev = porDia.get(key) ?? { gen: 0, cons: 0, fecha: c.fecha };
    prev.cons += c.kwh;
    porDia.set(key, prev);
  }
  const chartData: PuntoEnergia[] = [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b)) // ascendente por fecha (clave AAAA-MM-DD)
    .slice(-14) // últimos 14 días con registro
    .map(([, v]) => ({
      label: v.fecha.toLocaleDateString("es-CO", { month: "short", day: "numeric" }),
      generacion: round2(v.gen),
      consumo: round2(v.cons),
    }));

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

      {/* Ahorro solar del mes + gráfica generación vs consumo */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Ahorro solar del mes
          </div>
          <div className="mt-1 text-3xl font-bold text-emerald-600">
            {formatMoney(balMes.ahorroCents)}
          </div>
          <div className="mt-1 text-sm capitalize text-slate-500">{nombreMes}</div>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-amber-600">{balMes.porcentajeSolar}%</span> del
              consumo cubierto con paneles.
            </p>
            <p className="text-xs text-slate-500">
              Generado {genMes.toFixed(1)} kWh · Consumido {consMes.toFixed(1)} kWh
            </p>
          </div>
          {precioKwhCents === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Define el precio del kWh abajo para ver el ahorro en pesos.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">
            Generación solar vs consumo (por día)
          </h2>
          <EnergiaChart data={chartData} />
        </div>
      </div>

      {/* Precio del kWh */}
      <form action={guardarPrecioKwh} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="text-slate-500">Precio del kWh ($)</span>
          <input name="precioPesos" type="number" min="0" step="1" defaultValue={precioKwhCents ? fromCents(precioKwhCents) : ""} className="mt-1 w-40 rounded-lg border border-slate-300 px-2 py-1.5" />
        </label>
        <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">Guardar precio</BotonGuardar>
      </form>

      {/* Conexión con Growatt */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
        <h2 className="font-semibold text-amber-700">☀️ Conexión automática con Growatt</h2>
        <p className="mt-1 text-sm text-slate-500">
          Guarda tu usuario y clave de la app Growatt para traer la generación de los paneles con un
          clic. {growattUsuario ? <span className="font-medium text-emerald-600">✓ Conectado como {growattUsuario}.</span> : "Aún no has conectado tu cuenta."}
        </p>

        <form action={guardarCredencialesGrowatt} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="text-slate-500">Usuario Growatt</span>
            <input name="growattUsuario" defaultValue={growattUsuario ?? ""} className="mt-1 w-48 rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Clave Growatt</span>
            <input name="growattClave" type="password" placeholder="••••••••" className="mt-1 w-48 rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <BotonGuardar className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Guardar cuenta
          </BotonGuardar>
        </form>

        <form action={sincronizarGrowattAccion} className="mt-3">
          <BotonGuardar
            pendingText="Sincronizando…"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            🔄 Sincronizar con Growatt
          </BotonGuardar>
        </form>
        {growattMsg && <p className="mt-2 text-sm text-slate-600">{growattMsg}</p>}
      </div>

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
