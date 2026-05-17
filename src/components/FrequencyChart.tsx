import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  TooltipProps,
} from "recharts";
import { format } from "date-fns";
import { MinuteBucket } from "../utils/parseLog";

type CustomTooltipProps = TooltipProps<number, string>;

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{format(new Date(label as string), "dd MMM yyyy, h:mm a (HH:mm)")}</p>
      <p className="tooltip-value">{payload[0].value} updates</p>
    </div>
  );
}

interface Props {
  buckets: MinuteBucket[];
  avgPerMinute: number;
}

export default function FrequencyChart({ buckets, avgPerMinute }: Props) {
  if (!buckets.length) return null;

  return (
    <div className="chart-wrapper">
      <h3 className="section-title">Location Updates per Minute</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={buckets} margin={{ top: 4, right: 12, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            tickFormatter={(t: string) => format(new Date(t), "HH:mm")}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          {avgPerMinute > 0 && (
            <ReferenceLine
              y={avgPerMinute}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: "avg", position: "right", fill: "#f59e0b", fontSize: 10 }}
            />
          )}
          <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0] as [number, number, number, number]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
