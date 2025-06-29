"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";

interface ChartData {
  name: string;
  total: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-subtle bg-background/95 backdrop-blur-sm p-3 shadow-medium">
        <p className="text-body-small font-medium text-foreground">
          {label}
        </p>
        <p className="text-body-small text-brand-primary">
          <span className="font-medium">Agendamentos: </span>
          {payload[0]?.value}
        </p>
      </div>
    );
  }
  return null;
}

export function Overview() {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Query otimizada com cache de 30 segundos
  const { data, isLoading, error, isStale } = api.dashboard.getOverviewData.useQuery(
    undefined,
    {
      staleTime: 30 * 1000, // 30 segundos
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      refetchInterval: 60 * 1000, // Atualiza a cada minuto
    },
  );

  useEffect(() => {
    if (data) {
      // Transformar os dados do formato retornado pela API
      const formattedData = data.map((item) => {
        const date = new Date(item.date);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        
        return {
          name: `${day}/${month}`,
          total: item.total,
        };
      });
      
      setChartData(formattedData);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-[350px] w-full rounded-xl border border-subtle bg-card p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded-md mb-4"></div>
        <div className="h-[280px] w-full bg-muted rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[350px] w-full rounded-xl border border-subtle bg-card p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-body text-muted-foreground">
            Erro ao carregar dados do gráfico
          </p>
          <p className="text-body-small text-muted-foreground/60 mt-1">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-subtle bg-card p-6 shadow-minimal transition-all duration-200",
        "hover:shadow-soft hover:border-border/80",
        isStale && "opacity-75"
      )}
    >
      {isStale && (
        <div className="mb-3 text-center">
          <span className="text-caption text-muted-foreground/60">
            Atualizando dados...
          </span>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-heading-3 font-semibold text-foreground">
          Agendamentos por Dia
        </h3>
        <p className="text-body-small text-muted-foreground mt-1">
          Últimos 7 dias
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ 
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
              fontWeight: 500
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            tick={{ 
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
              fontWeight: 500
            }}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ 
              fill: "hsl(var(--muted) / 0.3)",
              radius: 4
            }}
          />
          <Bar
            dataKey="total"
            radius={[6, 6, 0, 0]}
            fill="hsl(var(--brand-primary))"
            className="transition-all duration-200"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
