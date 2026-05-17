import { format } from "date-fns";
import { useRef, useEffect } from "react";
import { LocationEntry, Gap } from "../utils/parseLog";

interface Props {
  entries: LocationEntry[];
  selectedIndex: number | null;
  onSelectEntry: (index: number) => void;
  gaps: Gap[];
}

export default function Timeline({ entries, selectedIndex, onSelectEntry, gaps }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedIndex == null || !listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const gapSet = new Set<number>(
    gaps.map((g) => entries.findIndex((e) => e.timestamp >= g.to))
  );

  return (
    <div className="timeline-wrapper">
      <h3 className="section-title">Location Timeline</h3>
      <div className="timeline-list" ref={listRef}>
        {entries.map((e, i) => (
          <div
            key={i}
            className={[
              "timeline-item",
              selectedIndex === i ? "selected" : "",
              gapSet.has(i) ? "gap-after" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectEntry(i)}
          >
            <div className="tl-dot" style={{ background: e.moving ? "#3b82f6" : "#64748b" }} />
            <div className="tl-content">
              <div className="tl-time">{format(e.timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}</div>
              <div className="tl-coords">
                {e.lat.toFixed(6)}, {e.lng.toFixed(6)}
              </div>
              <div className="tl-meta">
                <span className={`tl-badge ${e.moving ? "moving" : "stationary"}`}>
                  {e.moving ? "Moving" : "Stationary"}
                </span>
                <span className="tl-speed">{e.speed} m/s</span>
                <span className="tl-battery">🔋 {e.batteryHealth}%</span>
              </div>
            </div>
            {gapSet.has(i) && (
              <div className="gap-indicator" title="Signal gap before this point">⚠</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
