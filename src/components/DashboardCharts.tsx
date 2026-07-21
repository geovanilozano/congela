"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/finance/money";

const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

export function IngresosChart({ data }: { data: { label: string; total: number }[] }) {
  if (data.length === 0)
    return <p className="p-6 text-center text-sm text-slate-400">Aún no hay cierres de caja.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v / 100000}k`} tick={{ fontSize: 11 }} width={40} />
        <Tooltip formatter={(v) => formatMoney(Number(v))} />
        <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TendenciaChart({
  data,
}: {
  data: { mes: string; ingresos: number; gastos: number }[];
}) {
  if (data.length === 0)
    return <p className="p-6 text-center text-sm text-slate-400">Aún no hay datos por mes.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v / 100000}k`} tick={{ fontSize: 11 }} width={40} />
        <Tooltip formatter={(v, n) => [formatMoney(Number(v)), n === "ingresos" ? "Ingresos" : "Gastos"]} />
        <Bar dataKey="ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FondosChart({ data }: { data: { nombre: string; saldo: number }[] }) {
  const filtered = data.filter((d) => d.saldo > 0);
  if (filtered.length === 0)
    return <p className="p-6 text-center text-sm text-slate-400">Los fondos aún están en cero.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={filtered} dataKey="saldo" nameKey="nombre" innerRadius={45} outerRadius={90} paddingAngle={2}>
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatMoney(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  );
}
