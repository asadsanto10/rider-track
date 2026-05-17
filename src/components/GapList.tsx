import { format } from "date-fns";
import { Gap, humanDuration } from "../utils/parseLog";

interface Props {
  gaps: Gap[];
  medianInterval: number;
  selectedGapIndex: number | null;
  onSelectGap: (index: number) => void;
}

export default function GapList({ gaps, medianInterval, selectedGapIndex, onSelectGap }: Props) {
  if (!gaps.length) {
    return (
      <div className="gap-empty">
        <span className="gap-ok">✓</span> No significant gaps detected
      </div>
    );
  }

  return (
    <div className="gap-list">
      <h3 className="section-title">
        Signal Gaps Detected <span className="badge badge-warn">{gaps.length}</span>
      </h3>
      <p className="gap-note">
        Expected interval: ~{(medianInterval / 1000).toFixed(1)}s — gaps exceed 2× · Click to view on map
      </p>
      <div className="gap-items">
        {gaps.map((g, i) => (
          <div
            key={i}
            className={`gap-item gap-item-clickable ${selectedGapIndex === i ? "gap-item-selected" : ""}`}
            onClick={() => onSelectGap(i)}
          >
            <div className="gap-item-header">
              <div className="gap-time">
                <span className="gap-point gap-point-before">{format(g.from, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}</span>
                <span className="gap-arrow">⇢</span>
                <span className="gap-point gap-point-after">{format(g.to, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}</span>
              </div>
              <span className="gap-view-hint">
                {selectedGapIndex === i ? "📍 on map" : "🗺 view"}
              </span>
            </div>
            <div className="gap-meta">
              <span className="gap-duration">{humanDuration(g.durationMs)} gap</span>
              <span className="gap-missed">
                ~{g.missedCount} missed update{g.missedCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
