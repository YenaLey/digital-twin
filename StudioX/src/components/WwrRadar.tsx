"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

type Props = { wwr: Record<string, number> };

export default function WwrRadar({ wwr }: Props) {
  const dirs = ["north", "east", "south", "west"];
  const data = dirs.map((d) => ({
    dir: d[0].toUpperCase() + d.slice(1),
    val: +(wwr[d] * 100).toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dir" />
        <PolarRadiusAxis domain={[0, 100]} />
        <Radar dataKey="val" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
