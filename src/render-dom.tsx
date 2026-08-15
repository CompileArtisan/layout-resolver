import type { ResolvedElement, ResolvedLayout } from "./resolver";

const ROLE_COLORS: Record<string, string> = {
  hero: "#e8eef7",
  primary: "#0f172a",
  secondary: "#475569",
  action: "#2563eb",
  branding: "#94a3b8",
};

function ElementBox({ el }: { el: ResolvedElement }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    boxSizing: "border-box",
  };

  if (el.type === "image" && el.role === "hero") {
    return (
      <div
        style={{
          ...style,
          background: `linear-gradient(135deg, ${ROLE_COLORS.hero}, #cbd8ec)`,
          border: "1px dashed #94a3b8",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 12,
          overflow: "hidden",
        }}
        data-el-id={el.id}
        data-role={el.role}
      >
        🖼 {el.content ?? "hero image"}
      </div>
    );
  }

  if (el.type === "image") {
    return (
      <div
        style={{
          ...style,
          background: "#e2e8f0",
          border: "1px solid #cbd5e1",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(8, Math.min(el.height * 0.4, 11)),
          color: "#64748b",
          overflow: "hidden",
        }}
        data-el-id={el.id}
        data-role={el.role}
      >
        {el.content ?? "logo"}
      </div>
    );
  }

  if (el.type === "button") {
    return (
      <button
        style={{
          ...style,
          background: ROLE_COLORS.action,
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: el.fontSize,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        data-el-id={el.id}
        data-role={el.role}
      >
        {el.content ?? "Action"}
      </button>
    );
  }

  return (
    <div
      style={{
        ...style,
        color: ROLE_COLORS[el.role] ?? "#0f172a",
        fontSize: el.fontSize,
        fontWeight: el.role === "primary" ? 700 : 500,
        lineHeight: 1.25,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
      data-el-id={el.id}
      data-role={el.role}
    >
      <span
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {el.content}
      </span>
    </div>
  );
}

export function AdSurfaceRenderer({ layout }: { layout: ResolvedLayout }) {
  return (
    <div
      style={{
        position: "relative",
        width: layout.surfaceWidth,
        height: layout.surfaceHeight,
        background: "#ffffff",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }}
      data-composition={layout.composition}
    >
      {layout.elements.map((el) => (
        <ElementBox key={el.id} el={el} />
      ))}
    </div>
  );
}
