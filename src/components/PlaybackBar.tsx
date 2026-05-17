import { format } from "date-fns";
import { LocationEntry } from "../utils/parseLog";

interface Props {
  entries: LocationEntry[];
  playbackIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  onSeek: (index: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const SPEEDS = [1, 5, 10, 20];

export default function PlaybackBar({
  entries,
  playbackIndex,
  isPlaying,
  playSpeed,
  onSeek,
  onTogglePlay,
  onSpeedChange,
  onReset,
  onPrev,
  onNext,
}: Props) {
  if (!entries.length) return null;

  const current = entries[playbackIndex];
  const last = entries[entries.length - 1];
  const progress = entries.length > 1 ? (playbackIndex / (entries.length - 1)) * 100 : 0;

  return (
    <div className="playback-bar">
      {/* Controls */}
      <div className="pb-controls">
        <button className="pb-btn pb-btn-reset" onClick={onReset} title="Reset to start">⟳</button>
        <button
          className="pb-btn pb-btn-step"
          onClick={onPrev}
          disabled={playbackIndex <= 0}
          title="Previous point"
        >‹</button>
        <button
          className={`pb-btn pb-btn-play ${isPlaying ? "playing" : ""}`}
          onClick={onTogglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          className="pb-btn pb-btn-step"
          onClick={onNext}
          disabled={playbackIndex >= entries.length - 1}
          title="Next point"
        >›</button>
        <div className="pb-speed-group">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`pb-speed-btn ${playSpeed === s ? "active" : ""}`}
              onClick={() => onSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber */}
      <div className="pb-scrubber-wrap">
        <span className="pb-time pb-time-start">
          {format(entries[0].timestamp, "dd MMM, h:mm:ss a (HH:mm:ss)")}
        </span>
        <div className="pb-track">
          <div className="pb-fill" style={{ width: `${progress}%` }} />
          <input
            type="range"
            className="pb-range"
            min={0}
            max={entries.length - 1}
            value={playbackIndex}
            onChange={(e) => onSeek(Number(e.target.value))}
          />
        </div>
        <span className="pb-time pb-time-end">
          {format(last.timestamp, "dd MMM, h:mm:ss a (HH:mm:ss)")}
        </span>
      </div>

      {/* Current info */}
      <div className="pb-info">
        <span className="pb-current-time">{format(current.timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}</span>
        <span className={`pb-status ${current.moving ? "moving" : "stopped"}`}>
          {current.moving ? "▶ Moving" : "● Stopped"}
        </span>
        <span className="pb-speed-val">{current.speed} m/s</span>
      </div>
    </div>
  );
}
