import { useState, ChangeEvent, FormEvent } from "react";
import { CustomLocation } from "../types";

interface Props {
  locations: CustomLocation[];
  onAdd: (loc: CustomLocation) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#10b981", "#f59e0b", "#ef4444"];

function nextColor(locations: CustomLocation[]) {
  return COLORS[locations.length % COLORS.length];
}

const EMPTY = { name: "", lat: "", lng: "" };

export default function CustomLocations({
  locations, onAdd, onRemove, onSelect, selectedId,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof EMPTY) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setError(null);
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setError("Invalid latitude (−90 to 90)"); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setError("Invalid longitude (−180 to 180)"); return; }

    onAdd({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      lat,
      lng,
      color: nextColor(locations),
    });
    setForm(EMPTY);
    setError(null);
  }

  return (
    <div className="cl-wrapper">
      <h3 className="section-title">Custom Locations</h3>

      {/* Add form */}
      <form className="cl-form" onSubmit={handleSubmit}>
        <div className="cl-field-row">
          <div className="cl-field cl-field-name">
            <label className="cl-label">Name</label>
            <input
              className="cl-input"
              placeholder="e.g. Restaurant HQ"
              value={form.name}
              onChange={set("name")}
            />
          </div>
        </div>
        <div className="cl-field-row">
          <div className="cl-field">
            <label className="cl-label">Latitude</label>
            <input
              className="cl-input"
              placeholder="23.7426"
              value={form.lat}
              onChange={set("lat")}
            />
          </div>
          <div className="cl-field">
            <label className="cl-label">Longitude</label>
            <input
              className="cl-input"
              placeholder="90.3824"
              value={form.lng}
              onChange={set("lng")}
            />
          </div>
        </div>
        {error && <p className="cl-error">{error}</p>}
        <button className="cl-add-btn" type="submit">+ Add Marker</button>
      </form>

      {/* Location list */}
      {locations.length === 0 ? (
        <p className="cl-empty">No custom locations added yet.</p>
      ) : (
        <div className="cl-list">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`cl-item ${selectedId === loc.id ? "cl-item-selected" : ""}`}
              onClick={() => onSelect(selectedId === loc.id ? null : loc.id)}
            >
              <div className="cl-dot" style={{ background: loc.color }} />
              <div className="cl-item-body">
                <span className="cl-item-name">{loc.name}</span>
                <span className="cl-item-coords">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </span>
              </div>
              <button
                className="cl-remove-btn"
                title="Remove"
                onClick={(e) => { e.stopPropagation(); onRemove(loc.id); }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
