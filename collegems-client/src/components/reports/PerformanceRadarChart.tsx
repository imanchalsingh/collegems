import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface RadarMetricPoint {
  metric: string;
  student: number;
  classAverage: number;
}

interface PerformanceRadarChartProps {
  data: RadarMetricPoint[];
  height?: number;
}

export default function PerformanceRadarChart({
  data,
  height = 320,
}: PerformanceRadarChartProps) {
  return (
    <div style={{ width: "100%", height }} className="min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#334155", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
          />
          <Radar
            name="Student"
            dataKey="student"
            stroke="#0f766e"
            fill="#14b8a6"
            fillOpacity={0.35}
          />
          <Radar
            name="Class Average"
            dataKey="classAverage"
            stroke="#b45309"
            fill="#f59e0b"
            fillOpacity={0.2}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
