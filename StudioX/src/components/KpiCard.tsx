"use client";

import { Card, CardContent } from "@/components/ui/card"; // shadcn/ui
import { cn } from "@/lib/utils";
interface Props {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}
export default function KpiCard({ label, value, unit, className }: Props) {
  return (
    <Card className={cn("flex flex-col gap-1 p-4", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <CardContent className="p-0">
        <span className="text-2xl font-semibold">
          {value}
          {unit && <span className="ml-1 text-base font-normal">{unit}</span>}
        </span>
      </CardContent>
    </Card>
  );
}
