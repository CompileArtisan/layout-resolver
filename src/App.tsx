import { useMemo, useState } from "react";
import { defineAd } from "./spec";
import { surfaces, type SurfaceKey, defineSurface, type SurfaceProfile } from "./surfaces";
import { resolveLayout } from "./resolver";
import { AdSurfaceRenderer } from "./render-dom";

const adSpec = defineAd({
  elements: [
    { id: "headline", type: "text", role: "primary", priority: 1, content: "All-Day Comfort Running Shoes" },
    { id: "product-image", type: "image", role: "hero", priority: 1, content: "Aero Runner sneaker" },
    { id: "cta", type: "button", role: "action", priority: 1, content: "Shop Now" },
    { id: "price", type: "text", role: "secondary", priority: 2, content: "$89.99 — Free shipping today" },
    { id: "logo", type: "image", role: "branding", priority: 3, content: "Flam" },
  ],
});

const SURFACE_OPTIONS: { key: SurfaceKey; label: string }[] = [
  { key: "mobilePortrait", label: "📱 Mobile Portrait" },
  { key: "mobileLandscape", label: "📱 Mobile Landscape" },
  { key: "broadcastLowerThird", label: "📺 Broadcast Lower Third" },
  { key: "retailKiosk", label: "🖥️ Retail Kiosk (Square)" },
  { key: "tightBanner", label: "⚠️ Tight Banner (forces degradation)" },
];

export default function App() {
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("mobilePortrait");
  const [customSurface, setCustomSurface] = useState<SurfaceProfile | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [formValues, setFormValues] = useState({
    width: "600",
    height: "600",
    minTapTarget: "40",
    minTextSize: "",
    touchOnly: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const activeSurface = customSurface ?? surfaces[surfaceKey];

  const layout = useMemo(() => {
    try {
      return { data: resolveLayout(adSpec, activeSurface), error: null as string | null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [activeSurface]);

  function applyCustomSurface() {
    setFormError(null);
    try {
      const s = defineSurface({
        name: "Custom Live Surface",
        width: Number(formValues.width),
        height: Number(formValues.height),
        safeArea: { top: 8, right: 8, bottom: 8, left: 8 },
        minTapTarget: formValues.touchOnly ? Number(formValues.minTapTarget) || 44 : undefined,
        minTextSize: formValues.minTextSize ? Number(formValues.minTextSize) : undefined,
        viewingDistance: formValues.minTextSize ? "far" : undefined,
        touchOnly: formValues.touchOnly,
      });
      setCustomSurface(s);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Adaptive Layout Engine — Multi-Surface Ad Demo</h1>
      <p style={{ color: "#64748b", marginTop: 0, fontSize: 14 }}>
        One <code>adSpec</code>, resolved live into a different layout per surface. Nothing below is a
        hardcoded per-surface template — try "Tight Banner" to watch branding drop and the layout
        re-pack automatically, or add a custom surface at the bottom.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        {SURFACE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => {
              setCustomSurface(null);
              setSurfaceKey(opt.key);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: !customSurface && surfaceKey === opt.key ? "2px solid #2563eb" : "1px solid #cbd5e1",
              background: !customSurface && surfaceKey === opt.key ? "#eff6ff" : "white",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustomForm((v) => !v)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: customSurface ? "2px solid #2563eb" : "1px dashed #94a3b8",
            background: customSurface ? "#eff6ff" : "white",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ✨ Custom surface…
        </button>
      </div>

      {showCustomForm && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <label>
              Width
              <br />
              <input
                type="number"
                value={formValues.width}
                onChange={(e) => setFormValues((f) => ({ ...f, width: e.target.value }))}
                style={{ width: 80 }}
              />
            </label>
            <label>
              Height
              <br />
              <input
                type="number"
                value={formValues.height}
                onChange={(e) => setFormValues((f) => ({ ...f, height: e.target.value }))}
                style={{ width: 80 }}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={formValues.touchOnly}
                onChange={(e) => setFormValues((f) => ({ ...f, touchOnly: e.target.checked }))}
              />{" "}
              Touch-only
            </label>
            <label>
              Min tap target
              <br />
              <input
                type="number"
                disabled={!formValues.touchOnly}
                value={formValues.minTapTarget}
                onChange={(e) => setFormValues((f) => ({ ...f, minTapTarget: e.target.value }))}
                style={{ width: 80 }}
              />
            </label>
            <label>
              Min text size (blank = near)
              <br />
              <input
                type="number"
                value={formValues.minTextSize}
                onChange={(e) => setFormValues((f) => ({ ...f, minTextSize: e.target.value }))}
                style={{ width: 80 }}
              />
            </label>
            <button onClick={applyCustomSurface} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
              Resolve
            </button>
          </div>
          {formError && <p style={{ color: "#dc2626", marginBottom: 0 }}>{formError}</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              display: "inline-block",
              transform: activeSurface.width > 900 ? "scale(0.5)" : activeSurface.width > 500 ? "scale(0.75)" : "none",
              transformOrigin: "top left",
            }}
          >
            {layout.data ? (
              <AdSurfaceRenderer layout={layout.data} />
            ) : (
              <div
                style={{
                  width: activeSurface.width,
                  height: activeSurface.height,
                  border: "2px solid #dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  textAlign: "center",
                  color: "#dc2626",
                  fontSize: 13,
                }}
              >
                {layout.error}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#334155", minWidth: 260 }}>
          <h3 style={{ marginBottom: 6, fontSize: 14 }}>{activeSurface.name}</h3>
          <div>
            Size: {activeSurface.width} × {activeSurface.height}
          </div>
          {layout.data && (
            <div>
              Composition: <code>{layout.data.composition}</code>
            </div>
          )}
          {activeSurface.touchOnly && <div>Min tap target: {activeSurface.minTapTarget}px</div>}
          {activeSurface.viewingDistance === "far" && <div>Min text size: {activeSurface.minTextSize}px</div>}
          {layout.data && layout.data.dropped.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: "#fef2f2", borderRadius: 6 }}>
              <strong>Degraded:</strong>
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {layout.data.dropped.map((d) => (
                  <li key={d.id}>
                    {d.id} — {d.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
