"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

export function SalesChart({ data }: { data: { date: string; sales: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          }
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <defs>
          <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          dataKey="sales"
          type="monotone"
          fill="url(#fillSales)"
          stroke="var(--color-sales)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
