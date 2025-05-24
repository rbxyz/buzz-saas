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
  date: string; // data no formato ISO, ex: "2025-05-10"
  total: number;
};

export function Overview() {
  const { data, isLoading, error } = trpc.dashboard.getOverviewData.useQuery();

  // Estado local com dados transformados para o gráfico
  const [chartData, setChartData] = useState<{ name: string; total: number }[]>(
    [],
  );

  useEffect(() => {
    if (!data) return;

    // Mapear os dados do backend para o formato esperado pelo gráfico
    const formattedData = data.map((item: OverviewDataItem) => {
      const date = new Date(item.date);
      // Formatar para "DD/MM"
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");

      return {
        name: `${day}/${month}`,
        total: item.total,
      };
    });

    setChartData(formattedData);
  }, [data]);

  if (isLoading) return <div>Carregando gráfico...</div>;
  if (error) return <div>Erro ao carregar gráfico: {error.message}</div>;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
