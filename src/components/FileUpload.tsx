import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { parseCSVToRaw } from "../utils/parseLog";

interface Props {
  onData: (raw: unknown[], fileName: string) => void;
}

export default function FileUpload({ onData }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file: File | undefined) {
    if (!file) return;
    const isJSON = file.name.endsWith(".json");
    const isCSV  = file.name.endsWith(".csv");
    if (!isJSON && !isCSV) {
      setError("Please upload a .json or .csv file");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (isCSV) {
          const raw = parseCSVToRaw(text);
          if (!raw.length) { setError("No valid log rows found in CSV"); return; }
          onData(raw, file.name);
        } else {
          const parsed = JSON.parse(text) as unknown;
          onData(Array.isArray(parsed) ? parsed : [parsed], file.name);
        }
      } catch {
        setError(`Invalid ${isCSV ? "CSV" : "JSON"} file`);
      }
    };
    reader.readAsText(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0]);
  }

  return (
    <div
      className={`upload-zone ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv"
        style={{ display: "none" }}
        onChange={onChange}
      />
      <div className="upload-icon">📂</div>
      <p className="upload-text">Drop your rider log here or click to browse</p>
      <p className="upload-hint">Accepts .json and .csv (Foodi rider-tracking-service log format)</p>
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}
