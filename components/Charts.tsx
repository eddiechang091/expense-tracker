"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#1f2833",
  border: "1px solid #2b3542",
  borderRadius: 8,
  color: "#e8edf3",
};

export function MonthlyBarChart({ data }: { data: Array<{ label: string; total: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2b3542" />
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} interval={0} />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v: number) => `$${v}`} width={60} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "Spent"]}
        />
        <Bar dataKey="total" fill="#4ade80" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({
  data,
}: {
  data: Array<{ category: string; color: string; total: number }>;
}) {
  if (data.length === 0) return <p className="empty">No spending yet for this period.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry: { category: string }) => entry.category}
          labelLine={false}
        >
          {data.map((d) => (
            <Cell key={d.category} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "Spent"]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
