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
  date: string;
  total: number;
};

type ChartPayloadItem = {
  value: number;
  payload: {
    name: string;
    total: number;
  };
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && Array.isArray(payload) && payload.length > 0) {
    const firstItem = payload[0];
    if (firstItem?.value !== undefined) {
      return (
        <div className="bg-primary-foreground text-primary border-sidebar-border rounded border p-2 shadow-lg">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-black">{firstItem.value} agendamentos</p>
        </div>
      );
    }
  }

  return null;
}

export function Overview() {
  // Query otimizada com cache de 2 minutos
  const { data, isLoading, error, isStale } =
    trpc.dashboard.getOverviewData.useQuery(undefined, {
      staleTime: 2 * 60 * 1000, // 2 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
    });

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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="text-muted p-4 text-center">
        <div className="animate-pulse">
          <div className="bg-muted mb-4 h-64 rounded"></div>
          <div className="bg-muted mx-auto h-4 w-32 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-4 text-center">
        Erro ao carregar gráfico: {error.message}
      </div>
    );
  }

  return (
    <div
      className={`bg-background text-foreground border-sidebar-border animate-fade-in rounded border p-4 shadow ${isStale ? "opacity-75" : ""}`}
    >
      {isStale && (
        <div className="text-muted-foreground mb-2 text-center text-xs">
          Atualizando dados...
        </div>
      )}
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
