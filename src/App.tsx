import { useState, useMemo, useEffect, useRef } from "react";
import FileUpload from "./components/FileUpload";
import MapView from "./components/MapView";
import Timeline from "./components/Timeline";
import FrequencyChart from "./components/FrequencyChart";
import GapList from "./components/GapList";
import StatsBar from "./components/StatsBar";
import PlaybackBar from "./components/PlaybackBar";
import CustomLocations from "./components/CustomLocations";
import {
  parseLogFile,
  analyzeGaps,
  bucketByMinute,
  LocationEntry,
  Gap,
} from "./utils/parseLog";
import { CustomLocation } from "./types";
import "./App.css";

type Tab = "timeline" | "frequency" | "gaps" | "places";

export default function App() {
  const [entries, setEntries] = useState<LocationEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedGapIndex, setSelectedGapIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");

  // Custom locations state
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);

  // Playback state
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(10);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { medianInterval, gaps } = useMemo(() => analyzeGaps(entries), [entries]);
  const buckets = useMemo(() => bucketByMinute(entries), [entries]);
  const avgPerMinute = useMemo(() => {
    if (!buckets.length) return 0;
    return +(buckets.reduce((s, b) => s + b.count, 0) / buckets.length).toFixed(1);
  }, [buckets]);

  const selectedGap: Gap | null =
    selectedGapIndex !== null ? (gaps[selectedGapIndex] ?? null) : null;

  // Playback interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || !entries.length) return;

    const stepMs = Math.max(50, medianInterval / playSpeed);
    intervalRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= entries.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, stepMs);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playSpeed, medianInterval, entries.length]);

  function handleData(raw: unknown[], name: string) {
    setEntries(parseLogFile(raw));
    setFileName(name);
    setSelectedIndex(null);
    setSelectedGapIndex(null);
    setIsPlaying(false);
    setPlaybackIndex(0);
  }

  function reset() {
    setEntries([]);
    setFileName("");
    setSelectedIndex(null);
    setSelectedGapIndex(null);
    setIsPlaying(false);
    setPlaybackIndex(0);
  }

  function handleSelectGap(index: number) {
    setSelectedGapIndex((prev) => (prev === index ? null : index));
    setSelectedIndex(null);
  }

  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { id: "timeline", label: "📍 Timeline" },
    { id: "frequency", label: "📊 Frequency" },
    {
      id: "gaps",
      label: (
        <>
          ⚠ Gaps{" "}
          {gaps.length > 0 && <span className="tab-badge">{gaps.length}</span>}
        </>
      ),
    },
    { id: "places", label: "📌 Places" },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">🛵</span>
          <span className="app-title">Rider Track Viewer</span>
        </div>
        {entries.length > 0 && (
          <button className="btn-reset" onClick={reset}>✕ Clear</button>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="upload-screen">
          <FileUpload onData={handleData} />
        </div>
      ) : (
        <div className="main-layout">
          <StatsBar entries={entries} gaps={gaps} medianInterval={medianInterval} fileName={fileName} />

          <div className="content-area">
            <div className="map-panel">
              <MapView
                entries={entries}
                gaps={gaps}
                selectedIndex={selectedIndex}
                onSelectEntry={(i) => { setSelectedIndex(i); setSelectedGapIndex(null); }}
                riderId={entries[0]?.riderId ?? null}
                selectedGap={selectedGap}
                playbackIndex={isPlaying || playbackIndex > 0 ? playbackIndex : null}
                customLocations={customLocations}
                selectedCustomId={selectedCustomId}
              />
              <PlaybackBar
                entries={entries}
                playbackIndex={playbackIndex}
                isPlaying={isPlaying}
                playSpeed={playSpeed}
                onSeek={(i) => { setPlaybackIndex(i); setIsPlaying(false); }}
                onTogglePlay={() => {
                  if (playbackIndex >= entries.length - 1) setPlaybackIndex(0);
                  setIsPlaying((p) => !p);
                }}
                onSpeedChange={setPlaySpeed}
                onReset={() => { setPlaybackIndex(0); setIsPlaying(false); }}
              />
            </div>

            <div className="side-panel">
              <div className="tab-bar">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="tab-content">
                {activeTab === "timeline" && (
                  <Timeline
                    entries={entries}
                    selectedIndex={selectedIndex}
                    onSelectEntry={(i) => { setSelectedIndex(i); setSelectedGapIndex(null); }}
                    gaps={gaps}
                  />
                )}
                {activeTab === "frequency" && (
                  <div className="frequency-panel">
                    <FrequencyChart buckets={buckets} avgPerMinute={avgPerMinute} />
                    <div className="freq-summary">
                      <div className="freq-stat">
                        <span className="freq-num">{avgPerMinute}</span>
                        <span className="freq-lbl">avg / min</span>
                      </div>
                      <div className="freq-stat">
                        <span className="freq-num">
                          {buckets.length ? Math.max(...buckets.map((b) => b.count)) : 0}
                        </span>
                        <span className="freq-lbl">peak / min</span>
                      </div>
                      <div className="freq-stat">
                        <span className="freq-num">{(medianInterval / 1000).toFixed(1)}s</span>
                        <span className="freq-lbl">median interval</span>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "gaps" && (
                  <GapList
                    gaps={gaps}
                    medianInterval={medianInterval}
                    selectedGapIndex={selectedGapIndex}
                    onSelectGap={handleSelectGap}
                  />
                )}
                {activeTab === "places" && (
                  <CustomLocations
                    locations={customLocations}
                    onAdd={(loc) => setCustomLocations((prev) => [...prev, loc])}
                    onRemove={(id) => {
                      setCustomLocations((prev) => prev.filter((l) => l.id !== id));
                      if (selectedCustomId === id) setSelectedCustomId(null);
                    }}
                    onSelect={setSelectedCustomId}
                    selectedId={selectedCustomId}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
