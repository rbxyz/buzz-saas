"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { trpc } from "@/utils/trpc";

type OverviewDataItem = {
  date: string; // ex: "2025-05-10"
  total: number;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-primary-foreground text-primary border-sidebar-border rounded border p-2 shadow-lg">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-accent">{payload[0].value}</p>
      </div>
    );
  }

  return null;
}

export function Overview() {
  const { data, isLoading, error } = trpc.dashboard.getOverviewData.useQuery();

  const [chartData, setChartData] = useState<{ name: string; total: number }[]>(
    [],
  );

  useEffect(() => {
    if (!data) return;

    const formattedData = data.map((item: OverviewDataItem) => {
      const date = new Date(item.date);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");

      return {
        name: `${day}/${month}`,
        total: item.total,
      };
    });

    setChartData(formattedData);
  }, [data]);

  if (isLoading)
    return (
      <div className="text-muted p-4 text-center">Carregando gráfico...</div>
    );
  if (error)
    return (
      <div className="text-destructive p-4 text-center">
        Erro ao carregar gráfico: {error.message}
      </div>
    );

  return (
    <div className="bg-background text-foreground border-sidebar-border animate-fade-in rounded border p-4 shadow">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--sidebar-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--sidebar-foreground))" }}
          />
          <YAxis
            stroke="hsl(var(--sidebar-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            tick={{ fill: "hsl(var(--sidebar-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            radius={[4, 4, 0, 0]}
            className="bg-primary"
            fill="hsl(var(--primary))"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
