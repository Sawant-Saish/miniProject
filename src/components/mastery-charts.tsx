"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MasteryChartPoint } from "@/lib/analytics";

type MasteryTrendChartProps = {
  data: MasteryChartPoint[];
  height?: number;
};

export function MasteryTrendChart({
  data,
  height = 240,
}: MasteryTrendChartProps) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete a revision attempt to see the mastery trend chart.
      </p>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
            formatter={(value, name) => {
              if (name === "mastery") return [`${value}%`, "Mastery"];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="mastery"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type SubjectMasteryChartProps = {
  data: Array<{ name: string; mastery: number; topicCount: number }>;
  height?: number;
};

export function SubjectMasteryChart({
  data,
  height = 260,
}: SubjectMasteryChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add active topics to see subject retention averages.
      </p>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={data.length > 3 ? -20 : 0}
            textAnchor={data.length > 3 ? "end" : "middle"}
            height={data.length > 3 ? 50 : 30}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
            formatter={(value, _name, item) => {
              const payload = item.payload as { topicCount?: number };
              return [
                `${value}% avg · ${payload.topicCount ?? 0} topic(s)`,
                "Retention",
              ];
            }}
          />
          <Bar
            dataKey="mastery"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type TopicMasteryBarChartProps = {
  data: Array<{ name: string; mastery: number }>;
  height?: number;
};

export function TopicMasteryBarChart({
  data,
  height = Math.max(200, data.length * 36),
}: TopicMasteryBarChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
            formatter={(value) => [`${value}%`, "Mastery"]}
          />
          <Bar
            dataKey="mastery"
            fill="var(--chart-2, var(--primary))"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
