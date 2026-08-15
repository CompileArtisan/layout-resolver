import type { AdElementSpec, ElementRole, ElementType, TypedAdSpec } from "./spec";
import type { SurfaceProfile } from "./surfaces";

export interface ResolvedElement {
  id: string;
  role: ElementRole;
  type: ElementType;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
}

export type Composition = "stack-vertical" | "stack-horizontal" | "grid-hybrid";

export interface ResolvedLayout {
  surfaceName: string;
  surfaceWidth: number;
  surfaceHeight: number;
  composition: Composition;
  elements: ResolvedElement[];
  dropped: { id: string; reason: string }[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function usableRect(surface: SurfaceProfile): Rect {
  const sa = surface.safeArea ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    x: sa.left,
    y: sa.top,
    width: surface.width - sa.left - sa.right,
    height: surface.height - sa.top - sa.bottom,
  };
}

const PORTRAIT_MAX_RATIO = 0.85;
const LANDSCAPE_MIN_RATIO = 1.6;

function classifyComposition(rect: Rect): Composition {
  const ratio = rect.width / rect.height;
  if (ratio <= PORTRAIT_MAX_RATIO) return "stack-vertical";
  if (ratio >= LANDSCAPE_MIN_RATIO) return "stack-horizontal";
  return "grid-hybrid";
}

function weightFor(priority: number): number {
  return 4 - priority;
}

const ROLE_WEIGHT: Record<ElementRole, number> = {
  hero: 1.6,
  primary: 1,
  secondary: 0.8,
  action: 1,
  branding: 0.5,
};

function elementWeight(el: AdElementSpec): number {
  return weightFor(el.priority) * ROLE_WEIGHT[el.role];
}

const DROP_ORDER: number[] = [3, 2];

const BASE_FONT_SIZE: Record<ElementRole, number> = {
  primary: 20,
  secondary: 14,
  action: 16,
  branding: 12,
  hero: 0,
};

const LINE_HEIGHT = 1.35;
const CHAR_WIDTH = 0.58;

function fontSizeFor(el: AdElementSpec, surface: SurfaceProfile): number {
  const base = BASE_FONT_SIZE[el.role] || 14;
  return Math.max(base, surface.minTextSize ?? 0);
}

interface MinFootprint {
  minWidth: number;
  minHeight: number;
  fontSize?: number;
}

function minFootprint(el: AdElementSpec, surface: SurfaceProfile): MinFootprint {
  switch (el.type) {
    case "image": {
      if (el.role === "hero") return { minWidth: 48, minHeight: 48 };
      return { minWidth: 20, minHeight: 20 };
    }
    case "button": {
      const tap = Math.max(surface.minTapTarget ?? 32, 32);
      const fontSize = Math.max(14, (surface.minTextSize ?? 0) * 0.6);
      const label = el.content ?? "Action";
      const textWidth = label.length * fontSize * CHAR_WIDTH;
      return {
        minWidth: Math.max(tap * 1.6, textWidth + 32),
        minHeight: tap,
        fontSize,
      };
    }
    case "text": {
      const fontSize = fontSizeFor(el, surface);
      const label = el.content ?? "";
      const charsPerLine = Math.max(6, Math.ceil((label.length || 10) / 2));
      const minWidth = Math.min(
        charsPerLine * fontSize * CHAR_WIDTH,
        label.length * fontSize * CHAR_WIDTH || fontSize * 4
      );
      return {
        minWidth: Math.max(minWidth, fontSize * 3),
        minHeight: fontSize * LINE_HEIGHT * (label.length > charsPerLine ? 2 : 1),
        fontSize,
      };
    }
  }
}

interface PackItem {
  id: string;
  minPrimary: number;
  weight: number;
}

interface PackedItem {
  id: string;
  primary: number;
  offset: number;
}

function packLinear(items: PackItem[], available: number, gap: number): PackedItem[] | null {
  const totalGap = gap * Math.max(0, items.length - 1);
  const totalMin = items.reduce((sum, it) => sum + it.minPrimary, 0);
  if (totalMin + totalGap > available) return null;

  const leftover = available - totalMin - totalGap;
  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0) || 1;

  let offset = 0;
  const result: PackedItem[] = [];
  for (const it of items) {
    const primary = it.minPrimary + leftover * (it.weight / totalWeight);
    result.push({ id: it.id, primary, offset });
    offset += primary + gap;
  }
  return result;
}

const FLOW_ORDER: ElementRole[] = ["hero", "primary", "secondary", "action", "branding"];

function orderElements(elements: AdElementSpec[]): AdElementSpec[] {
  return [...elements].sort((a, b) => FLOW_ORDER.indexOf(a.role) - FLOW_ORDER.indexOf(b.role));
}

interface CompositionResult {
  elements: ResolvedElement[];
}

function composeVertical(
  elements: AdElementSpec[],
  rect: Rect,
  surface: SurfaceProfile,
  gap: number
): CompositionResult | null {
  const ordered = orderElements(elements);
  const items: PackItem[] = ordered.map((el) => ({
    id: el.id,
    minPrimary: minFootprint(el, surface).minHeight,
    weight: elementWeight(el),
  }));

  const packed = packLinear(items, rect.height, gap);
  if (!packed) return null;

  const resolved: ResolvedElement[] = ordered.map((el) => {
    const p = packed.find((x) => x.id === el.id)!;
    const fp = minFootprint(el, surface);
    const width = el.type === "button" ? Math.min(fp.minWidth * 1.4, rect.width) : rect.width;
    const x = rect.x + (rect.width - width) / 2;
    return {
      id: el.id,
      role: el.role,
      type: el.type,
      content: el.content,
      x,
      y: rect.y + p.offset,
      width,
      height: p.primary,
      fontSize: fp.fontSize,
    };
  });

  return { elements: resolved };
}

function composeHorizontal(
  elements: AdElementSpec[],
  rect: Rect,
  surface: SurfaceProfile,
  gap: number
): CompositionResult | null {
  const ordered = orderElements(elements);
  const items: PackItem[] = ordered.map((el) => ({
    id: el.id,
    minPrimary: minFootprint(el, surface).minWidth,
    weight: elementWeight(el),
  }));

  const packed = packLinear(items, rect.width, gap);
  if (!packed) return null;

  const resolved: ResolvedElement[] = ordered.map((el) => {
    const p = packed.find((x) => x.id === el.id)!;
    const fp = minFootprint(el, surface);
    const height = el.role === "hero" ? rect.height : Math.min(fp.minHeight, rect.height);
    const y = rect.y + (rect.height - height) / 2;
    return {
      id: el.id,
      role: el.role,
      type: el.type,
      content: el.content,
      x: rect.x + p.offset,
      y,
      width: p.primary,
      height,
      fontSize: fp.fontSize,
    };
  });

  return { elements: resolved };
}

function composeGridHybrid(
  elements: AdElementSpec[],
  rect: Rect,
  surface: SurfaceProfile,
  gap: number
): CompositionResult | null {
  const hero = elements.find((e) => e.role === "hero");
  const rest = elements.filter((e) => e.role !== "hero");

  const heroRatio = hero ? 0.52 : 0;
  const heroWidth = rect.width * heroRatio;
  const restRect: Rect = {
    x: rect.x + heroWidth + (hero ? gap : 0),
    y: rect.y,
    width: rect.width - heroWidth - (hero ? gap : 0),
    height: rect.height,
  };

  const restResult = composeVertical(rest, restRect, surface, gap);
  if (!restResult) return null;

  const resolved: ResolvedElement[] = [...restResult.elements];
  if (hero) {
    const fp = minFootprint(hero, surface);
    if (heroWidth < fp.minWidth || rect.height < fp.minHeight) return null;
    resolved.unshift({
      id: hero.id,
      role: hero.role,
      type: hero.type,
      content: hero.content,
      x: rect.x,
      y: rect.y,
      width: heroWidth,
      height: rect.height,
      fontSize: undefined,
    });
  }

  return { elements: resolved };
}

function compose(
  composition: Composition,
  elements: AdElementSpec[],
  rect: Rect,
  surface: SurfaceProfile,
  gap: number
): CompositionResult | null {
  switch (composition) {
    case "stack-vertical":
      return composeVertical(elements, rect, surface, gap);
    case "stack-horizontal":
      return composeHorizontal(elements, rect, surface, gap);
    case "grid-hybrid":
      return composeGridHybrid(elements, rect, surface, gap);
  }
}

function pickDropCandidate(elements: AdElementSpec[]): AdElementSpec | null {
  for (const priority of DROP_ORDER) {
    const candidates = elements.filter((e) => e.priority === priority);
    if (candidates.length > 0) {
      return [...candidates].sort((a, b) => FLOW_ORDER.indexOf(b.role) - FLOW_ORDER.indexOf(a.role))[0];
    }
  }
  return null;
}

function degradeToFit(
  composition: Composition,
  elements: AdElementSpec[],
  rect: Rect,
  surface: SurfaceProfile,
  gap: number
): { result: CompositionResult; dropped: { id: string; reason: string }[] } {
  let working = elements;
  const dropped: { id: string; reason: string }[] = [];

  for (let attempt = 0; attempt <= elements.length; attempt++) {
    const result = compose(composition, working, rect, surface, gap);
    if (result) return { result, dropped };

    const candidate = pickDropCandidate(working);
    if (!candidate) {
      if (gap > 0) {
        const tighter = compose(composition, working, rect, surface, 0);
        if (tighter) return { result: tighter, dropped };
      }
      throw new Error(
        `Can't fit priority-1 elements (${working.map((e) => e.id).join(", ")}) on "${surface.name}" ` +
          `even at minimum size — this surface is too small for the non-negotiable content.`
      );
    }

    dropped.push({
      id: candidate.id,
      reason: `Dropped (priority ${candidate.priority}) — not enough space on "${surface.name}".`,
    });
    working = working.filter((e) => e.id !== candidate.id);
  }

  throw new Error("Degradation loop went past its expected bound, which shouldn't be possible.");
}

function gapFor(surface: SurfaceProfile): number {
  return Math.max(4, Math.round(Math.min(surface.width, surface.height) * 0.02));
}

export function resolveLayout(spec: TypedAdSpec, surface: SurfaceProfile): ResolvedLayout {
  const rect = usableRect(surface);
  const composition = classifyComposition(rect);
  const gap = gapFor(surface);

  const { result, dropped } = degradeToFit(composition, spec.elements, rect, surface, gap);

  assertNoOverlaps(result.elements, surface);

  return {
    surfaceName: surface.name,
    surfaceWidth: surface.width,
    surfaceHeight: surface.height,
    composition,
    elements: result.elements,
    dropped,
  };
}

function assertNoOverlaps(elements: ResolvedElement[], surface: SurfaceProfile): void {
  const EPS = 0.5;
  for (const el of elements) {
    const outOfBounds =
      el.x < -EPS || el.y < -EPS || el.x + el.width > surface.width + EPS || el.y + el.height > surface.height + EPS;
    if (outOfBounds) {
      throw new Error(
        `"${el.id}" resolved outside the bounds of "${surface.name}" ` +
          `(x:${el.x.toFixed(1)} y:${el.y.toFixed(1)} w:${el.width.toFixed(1)} h:${el.height.toFixed(1)} ` +
          `vs ${surface.width}x${surface.height}) — resolver bug.`
      );
    }
  }
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i];
      const b = elements[j];
      const overlapX = a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS;
      const overlapY = a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
      if (overlapX && overlapY) {
        throw new Error(`"${a.id}" and "${b.id}" overlap on "${surface.name}" — resolver bug.`);
      }
    }
  }
}
