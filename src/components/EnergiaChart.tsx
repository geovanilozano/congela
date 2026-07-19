"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const kwh = (v: number) => `${v.toFixed(1)} kWh`;

export interface PuntoEnergia {
  label: string;
  generacion: number;
  consumo: number;
}

/**
 * Gráfica de barras: generación solar (ámbar) vs consumo (azul) por día.
 * Client component con Recharts, al estilo de DashboardCharts.
 */
export function EnergiaChart({ data }: { data: PuntoEnergia[] }) {
  if (data.length === 0)
    return (
      <p className="p-6 text-center text-sm text-slate-400">
        Aún no hay generación ni consumo registrados.
      </p>
    );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v}`} tick={{ fontSize: 11 }} width={40} unit="" />
        <Tooltip
          formatter={(v, n) => [kwh(Number(v)), n === "generacion" ? "Generación solar" : "Consumo"]}
        />
        <Legend
          formatter={(n) => (n === "generacion" ? "Generación solar" : "Consumo")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="generacion" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="consumo" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
