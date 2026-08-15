export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ViewingDistance = "near" | "far";

export interface SurfaceProfile {
  name: string;
  width: number;
  height: number;
  safeArea?: SafeArea;
  minTapTarget?: number;
  minTextSize?: number;
  viewingDistance?: ViewingDistance;
  touchOnly?: boolean;
}

export class SurfaceProfileError extends Error {
  constructor(message: string) {
    super(`defineSurface: ${message}`);
    this.name = "SurfaceProfileError";
  }
}

export function defineSurface(profile: SurfaceProfile): SurfaceProfile {
  if (profile.width <= 0 || profile.height <= 0) {
    throw new SurfaceProfileError(
      `"${profile.name}" needs a positive width/height, got ${profile.width}x${profile.height}`
    );
  }
  if (profile.touchOnly && !profile.minTapTarget) {
    throw new SurfaceProfileError(`"${profile.name}" is touchOnly but has no minTapTarget`);
  }
  if (profile.viewingDistance === "far" && !profile.minTextSize) {
    throw new SurfaceProfileError(`"${profile.name}" has viewingDistance "far" but no minTextSize`);
  }
  if (profile.safeArea) {
    const { top, right, bottom, left } = profile.safeArea;
    if (top + bottom >= profile.height || left + right >= profile.width) {
      throw new SurfaceProfileError(`"${profile.name}" safe area leaves no usable space`);
    }
  }
  return profile;
}

export const surfaces: Record<string, SurfaceProfile> = {
  mobilePortrait: defineSurface({
    name: "Mobile Interstitial (Portrait)",
    width: 320,
    height: 480,
    safeArea: { top: 16, right: 12, bottom: 16, left: 12 },
    minTapTarget: 44,
    touchOnly: true,
  }),

  mobileLandscape: defineSurface({
    name: "Mobile Interstitial (Landscape)",
    width: 480,
    height: 270,
    safeArea: { top: 8, right: 16, bottom: 8, left: 16 },
    minTapTarget: 44,
    touchOnly: true,
  }),

  broadcastLowerThird: defineSurface({
    name: "Broadcast Lower Third",
    width: 1920,
    height: 250,
    safeArea: { top: 8, right: 60, bottom: 8, left: 60 },
    viewingDistance: "far",
    minTextSize: 32,
  }),

  retailKiosk: defineSurface({
    name: "Retail Kiosk (Square)",
    width: 1080,
    height: 1080,
    safeArea: { top: 24, right: 24, bottom: 24, left: 24 },
    minTapTarget: 60,
    touchOnly: true,
  }),

  tightBanner: defineSurface({
    name: "Constrained Banner (forces degradation)",
    width: 420,
    height: 90,
    safeArea: { top: 4, right: 8, bottom: 4, left: 8 },
    minTapTarget: 32,
  }),
};

export type SurfaceKey = keyof typeof surfaces;
