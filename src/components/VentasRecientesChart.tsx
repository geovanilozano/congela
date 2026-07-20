"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = (cents: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    cents / 100,
  );

export function VentasRecientesChart({ data }: { data: { label: string; total: number }[] }) {
  const hayVentas = data.some((d) => d.total > 0);
  if (!hayVentas)
    return <p className="p-6 text-center text-sm text-slate-400">Aún no hay ventas en los últimos 14 días.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v / 100000}k`} tick={{ fontSize: 11 }} width={40} />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 3, fill: "#0ea5e9" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
