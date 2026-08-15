import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const { defineAd } = await server.ssrLoadModule("/src/spec.ts");
const { surfaces, defineSurface } = await server.ssrLoadModule("/src/surfaces.ts");
const { resolveLayout } = await server.ssrLoadModule("/src/resolver.ts");

const adSpec = defineAd({
  elements: [
    { id: "headline", type: "text", role: "primary", priority: 1, content: "All-Day Comfort Running Shoes" },
    { id: "product-image", type: "image", role: "hero", priority: 1, content: "Aero Runner sneaker" },
    { id: "cta", type: "button", role: "action", priority: 1, content: "Shop Now" },
    { id: "price", type: "text", role: "secondary", priority: 2, content: "$89.99 — Free shipping today" },
    { id: "logo", type: "image", role: "branding", priority: 3, content: "Flam" },
  ],
});

let failures = 0;

function check(cond, msg) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

for (const [key, surface] of Object.entries(surfaces)) {
  const layout = resolveLayout(adSpec, surface);
  console.log(`\n--- ${key} (${surface.width}x${surface.height}) -> ${layout.composition} ---`);
  for (const el of layout.elements) {
    console.log(
      `  ${el.id.padEnd(14)} x:${el.x.toFixed(0).padStart(5)} y:${el.y.toFixed(0).padStart(5)} w:${el.width.toFixed(0).padStart(5)} h:${el.height.toFixed(0).padStart(5)}`
    );
  }
  if (layout.dropped.length) {
    console.log("  dropped:", layout.dropped.map((d) => d.id).join(", "));
  }

  for (const el of layout.elements) {
    check(
      el.x >= -0.5 && el.y >= -0.5 && el.x + el.width <= surface.width + 0.5 && el.y + el.height <= surface.height + 0.5,
      `${key}: ${el.id} within bounds`
    );
  }
  for (let i = 0; i < layout.elements.length; i++) {
    for (let j = i + 1; j < layout.elements.length; j++) {
      const a = layout.elements[i];
      const b = layout.elements[j];
      const overlapX = a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5;
      const overlapY = a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
      check(!(overlapX && overlapY), `${key}: ${a.id} vs ${b.id} no overlap`);
    }
  }
  const droppedIds = new Set(layout.dropped.map((d) => d.id));
  for (const el of adSpec.elements) {
    if (el.priority === 1) {
      check(!droppedIds.has(el.id), `${key}: priority-1 element "${el.id}" not dropped`);
    }
  }
}

const compositions = new Set(
  ["mobilePortrait", "broadcastLowerThird", "retailKiosk"].map((k) => resolveLayout(adSpec, surfaces[k]).composition)
);
check(
  compositions.size === 3,
  `mobilePortrait/broadcastLowerThird/retailKiosk use 3 distinct compositions (got: ${[...compositions].join(", ")})`
);

const liveSurface = defineSurface({
  name: "Live Interview Surface",
  width: 900,
  height: 1600,
  safeArea: { top: 20, right: 16, bottom: 20, left: 16 },
  minTapTarget: 48,
  touchOnly: true,
});
const liveLayout = resolveLayout(adSpec, liveSurface);
console.log(`\n--- live unseen surface -> ${liveLayout.composition} ---`);
check(liveLayout.composition === "stack-vertical", "unseen tall surface classified as stack-vertical");
check(liveLayout.dropped.length === 0, "unseen surface fits everything (plenty of space)");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
await server.close();
process.exit(failures === 0 ? 0 : 1);
