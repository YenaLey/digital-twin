"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function PeakLoadBar({
  data,
}: {
  data: { heating?: number; cooling?: number };
}) {
  const chartData = [
    { name: "Heating", kW: data.heating ?? 0 },
    { name: "Cooling", kW: data.cooling ?? 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" strokeOpacity={0.6} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="kW" />
      </BarChart>
    </ResponsiveContainer>
  );
}
