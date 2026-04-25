import { OSM_BBOX_PADDING } from "../constants";

export function titleCase(value?: string | null): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function lerpColor(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  p: number,
): [number, number, number] {
  return [
    Math.round(r1 + (r2 - r1) * p),
    Math.round(g1 + (g2 - g1) * p),
    Math.round(b1 + (b2 - b1) * p),
  ];
}

export function buildOsmEmbedUrl(lat: number, lng: number): string {
  const p = OSM_BBOX_PADDING;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - p},${lat - p},${lng + p},${lat + p}&layer=mapnik&marker=${lat},${lng}`;
}
