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
import { formatMoney } from "@/lib/finance/money";

/**
 * Comparativo mensual: dos barras por mes (ingresos de ventas vs gastos).
 * Para ver de un vistazo en qué meses el negocio ganó o gastó más.
 */
export function ComparativoChart({
  data,
}: {
  data: { mes: string; ingresos: number; gastos: number }[];
}) {
  if (data.length === 0)
    return <p className="p-6 text-center text-sm text-slate-400">Aún no hay datos por mes.</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v / 100000}k`} tick={{ fontSize: 11 }} width={40} />
        <Tooltip formatter={(v, n) => [formatMoney(Number(v)), n === "ingresos" ? "Ingresos" : "Gastos"]} />
        <Legend formatter={(n) => (n === "ingresos" ? "Ingresos" : "Gastos")} wrapperStyle={{ fontSize: 12 }} />
        <Bar name="ingresos" dataKey="ingresos" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        <Bar name="gastos" dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
