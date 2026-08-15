export type ElementRole = "primary" | "hero" | "action" | "branding" | "secondary";
export type ElementType = "text" | "image" | "button";
export type ElementPriority = 1 | 2 | 3;

export interface AdElementSpec {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: ElementPriority;
  content?: string;
}

export interface AdSpec {
  elements: AdElementSpec[];
}

interface RoleTypeMap {
  primary: "text";
  secondary: "text";
  hero: "image";
  action: "button";
  branding: "image" | "text";
}

export type TypedAdElementSpec = {
  [R in ElementRole]: {
    id: string;
    role: R;
    type: RoleTypeMap[R];
    priority: ElementPriority;
    content?: string;
  };
}[ElementRole];

export interface TypedAdSpec {
  elements: TypedAdElementSpec[];
}

const ALLOWED_TYPES: Record<ElementRole, ElementType[]> = {
  primary: ["text"],
  secondary: ["text"],
  hero: ["image"],
  action: ["button"],
  branding: ["image", "text"],
};

const KNOWN_ROLES = new Set<ElementRole>(["primary", "hero", "action", "branding", "secondary"]);

export class AdSpecError extends Error {
  constructor(message: string) {
    super(`defineAd: ${message}`);
    this.name = "AdSpecError";
  }
}

export function defineAd(spec: TypedAdSpec): TypedAdSpec {
  if (!spec.elements || spec.elements.length === 0) {
    throw new AdSpecError("spec needs at least one element");
  }

  const seen = new Set<string>();
  let heroCount = 0;
  let actionCount = 0;

  for (const el of spec.elements) {
    if (seen.has(el.id)) throw new AdSpecError(`duplicate id "${el.id}"`);
    seen.add(el.id);

    if (!KNOWN_ROLES.has(el.role)) {
      throw new AdSpecError(`"${el.id}" has an unknown role "${el.role}"`);
    }

    const allowed = ALLOWED_TYPES[el.role];
    if (!allowed.includes(el.type)) {
      throw new AdSpecError(
        `"${el.id}" is role "${el.role}", which doesn't support type "${el.type}" (allowed: ${allowed.join(", ")})`
      );
    }

    if (![1, 2, 3].includes(el.priority)) {
      throw new AdSpecError(`"${el.id}" has priority ${el.priority}, expected 1, 2 or 3`);
    }

    if (el.role === "hero") heroCount++;
    if (el.role === "action") actionCount++;
  }

  if (heroCount > 1) throw new AdSpecError(`only one hero element is supported, found ${heroCount}`);
  if (actionCount > 1) throw new AdSpecError(`only one action element is supported, found ${actionCount}`);

  return spec;
}
