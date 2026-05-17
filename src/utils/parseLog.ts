export interface LocationEntry {
  timestamp: Date;
  riderId: string | null;
  lat: number;
  lng: number;
  speed: number;
  moving: boolean;
  accuracy: number;
  bearing: number;
  batteryHealth: number | null;
}

export interface Gap {
  from: Date;
  to: Date;
  durationMs: number;
  missedCount: number;
}

export interface GapAnalysis {
  medianInterval: number;
  threshold: number;
  gaps: Gap[];
}

export interface MinuteBucket {
  time: string;
  count: number;
}

interface RawLocationInfo {
  lat: number;
  long?: number;
  lng?: number;
  speed?: number;
  moving?: boolean;
  accuracy?: number;
  bearing?: number;
}

interface RawInner {
  level?: string;
  message?: string;
  timestamp?: string;
  // Direct fields (some log formats embed these at top level)
  riderId?: number | string;
  locationInfo?: RawLocationInfo;
  batteryHealth?: number;
}

interface RiderPayload {
  riderId?: number | string;
  locationInfo?: RawLocationInfo;
  batteryHealth?: number;
}

function extractRiderPayload(inner: RawInner): RiderPayload | null {
  // Case 1: fields are direct on inner (some formats)
  if (inner.locationInfo) {
    return {
      riderId: inner.riderId,
      locationInfo: inner.locationInfo,
      batteryHealth: inner.batteryHealth,
    };
  }

  // Case 2: payload is a JSON object embedded at the end of inner.message
  // e.g. "Received location from rider {"riderId":16024,"locationInfo":{...},...}"
  if (inner.message) {
    const braceIdx = inner.message.indexOf("{");
    if (braceIdx !== -1) {
      try {
        return JSON.parse(inner.message.slice(braceIdx)) as RiderPayload;
      } catch {
        // fall through
      }
    }
  }

  return null;
}

function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < row.length) {
    if (row[i] === '"') {
      let field = "";
      i++; // skip opening quote
      while (i < row.length) {
        if (row[i] === '"' && row[i + 1] === '"') { field += '"'; i += 2; }
        else if (row[i] === '"') { i++; break; }
        else { field += row[i++]; }
      }
      fields.push(field);
      if (row[i] === ",") i++;
    } else {
      const end = row.indexOf(",", i);
      if (end === -1) { fields.push(row.slice(i)); break; }
      fields.push(row.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

export function parseCSVToRaw(text: string): unknown[] {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  const lineIdx = headers.findIndex((h) => h === "Line");
  const dateIdx = headers.findIndex((h) => h === "Date");
  if (lineIdx === -1) return [];

  const result: unknown[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVRow(lines[i]);
    if (!fields[lineIdx]?.trim()) continue;
    result.push({
      line: fields[lineIdx],
      date: dateIdx !== -1 ? fields[dateIdx] : undefined,
    });
  }
  return result;
}

export function humanDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function parseLogFile(rawArray: unknown[]): LocationEntry[] {
  const entries: LocationEntry[] = [];

  for (const item of rawArray) {
    try {
      const record = item as Record<string, unknown>;
      const inner: RawInner =
        typeof record.line === "string"
          ? (JSON.parse(record.line) as RawInner)
          : (record.line as RawInner);

      const payload = extractRiderPayload(inner);
      if (!payload?.locationInfo) continue;

      const location = payload.locationInfo;
      const riderId = payload.riderId != null ? String(payload.riderId) : null;

      entries.push({
        timestamp: new Date((record.date as string) || (inner.timestamp as string)),
        riderId,
        lat: location.lat,
        lng: location.long ?? location.lng ?? 0,
        speed: location.speed ?? 0,
        moving: location.moving ?? false,
        accuracy: location.accuracy ?? 0,
        bearing: location.bearing ?? 0,
        batteryHealth: payload.batteryHealth ?? null,
      });
    } catch {
      // skip malformed entries
    }
  }

  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return entries;
}

export function analyzeGaps(entries: LocationEntry[], thresholdMultiplier = 2): GapAnalysis {
  if (entries.length < 2) return { medianInterval: 0, threshold: 0, gaps: [] };

  const intervals: number[] = [];
  for (let i = 1; i < entries.length; i++) {
    intervals.push(entries[i].timestamp.getTime() - entries[i - 1].timestamp.getTime());
  }

  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const threshold = medianInterval * thresholdMultiplier;

  const gaps: Gap[] = [];
  for (let i = 1; i < entries.length; i++) {
    const diff = entries[i].timestamp.getTime() - entries[i - 1].timestamp.getTime();
    if (diff > threshold) {
      gaps.push({
        from: entries[i - 1].timestamp,
        to: entries[i].timestamp,
        durationMs: diff,
        missedCount: Math.round(diff / medianInterval) - 1,
      });
    }
  }

  return { medianInterval, threshold, gaps };
}

export function bucketByMinute(entries: LocationEntry[]): MinuteBucket[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = new Date(
      e.timestamp.getFullYear(),
      e.timestamp.getMonth(),
      e.timestamp.getDate(),
      e.timestamp.getHours(),
      e.timestamp.getMinutes()
    ).toISOString();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([time, count]) => ({ time, count }));
}
