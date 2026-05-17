import { format, formatDuration, intervalToDuration } from "date-fns";
import { LocationEntry, Gap, humanDuration } from "../utils/parseLog";

interface Props {
  entries: LocationEntry[];
  gaps: Gap[];
  medianInterval: number;
  fileName: string;
}

export default function StatsBar({ entries, gaps, medianInterval, fileName }: Props) {
  if (!entries.length) return null;

  const first = entries[0].timestamp;
  const last = entries[entries.length - 1].timestamp;
  const duration = intervalToDuration({ start: first, end: last });
  const durationStr =
    formatDuration(duration, { format: ["hours", "minutes", "seconds"] }) || "0s";

  const movingCount = entries.filter((e) => e.moving).length;
  const avgBattery = (
    entries.reduce((s, e) => s + (e.batteryHealth ?? 0), 0) / entries.length
  ).toFixed(0);

  const totalGapMs = gaps.reduce((s, g) => s + g.durationMs, 0);
  const totalMissed = gaps.reduce((s, g) => s + g.missedCount, 0);

  const stats: { label: string; value: string | number; color: string }[] = [
    { label: "Total Updates", value: entries.length, color: "#3b82f6" },
    { label: "Time Span", value: durationStr, color: "#8b5cf6" },
    { label: "Avg Interval", value: `${(medianInterval / 1000).toFixed(1)}s`, color: "#06b6d4" },
    { label: "Moving Points", value: `${movingCount} / ${entries.length}`, color: "#22c55e" },
    { label: "Signal Gaps", value: gaps.length, color: "#f97316" },
    { label: "Missed Updates", value: totalMissed, color: "#ef4444" },
    { label: "Gap Time", value: humanDuration(totalGapMs), color: "#f59e0b" },
    { label: "Avg Battery", value: `${avgBattery}%`, color: "#10b981" },
  ];

  return (
    <div className="stats-bar">
      <div className="stats-header">
        <span className="rider-id">Rider #{entries[0]?.riderId ?? "?"}</span>
        <span className="stats-file">{fileName}</span>
        <span className="stats-range">
          {format(first, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")} — {format(last, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}
        </span>
      </div>
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
