// ── Types ─────────────────────────────────────────────────────────────────────

export interface CoastResult {
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
}

export interface LocationCoastResult {
  coords: { lat: number; lng: number } | null;
  coast: CoastResult | null;
}

export interface FuelPriceResponse {
  effectiveDate: string;
  ron95Price: number;
  dieselPrice: number;
}

export interface AuthProfile {
  id: string;
  name: string;
  locality: string;
}

export interface RecommendationIndicator {
  indicator: string;
  score: number;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  summary: string;
}

export interface RecommendationAnalysis {
  shouldFishToday: boolean;
  profitConfidence: number;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
  estimatedFuelCostRm: number | null;
  keySignals: string[];
  indicators: RecommendationIndicator[];
}

export interface RecommendationResponse {
  verdict: "GO" | "NO_GO" | "ERROR";
  reason: string;
  errorDetail?: string;
  analysis: RecommendationAnalysis | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getApiBaseUrl(): string {
  return process.env.REACT_APP_API_BASE_URL ?? "http://localhost:3000";
}

function apiUrl(path: string, params?: URLSearchParams): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const query = params?.toString();
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

// ── Backend fuel pricing ──────────────────────────────────────────────────────

export async function getFuelPrice(locality?: string): Promise<FuelPriceResponse> {
  const params = new URLSearchParams();
  const trimmedLocality = locality?.trim();
  if (trimmedLocality) params.set("locality", trimmedLocality);

  const res = await fetch(apiUrl("/fuel/latest", params));
  if (!res.ok) throw new Error(`Fuel price request failed: ${res.status}`);
  return res.json() as Promise<FuelPriceResponse>;
}

// ── Fishing recommendation ───────────────────────────────────────────────────

export async function getRecommendation(): Promise<RecommendationResponse> {
  const res = await fetch(apiUrl("/recommendation"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!res.ok) throw new Error(`Recommendation request failed: ${res.status}`);
  return res.json() as Promise<RecommendationResponse>;
}

// ── Backend auth ──────────────────────────────────────────────────────────────

export async function loginWithIc(icNumber: string): Promise<AuthProfile> {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ icNumber }),
  });

  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json() as Promise<AuthProfile>;
}

export async function registerWithIc(profile: {
  icNumber: string;
  name: string;
  locality: string;
}): Promise<AuthProfile> {
  const res = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(profile),
  });

  if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
  return res.json() as Promise<AuthProfile>;
}

// ── Overpass / coast lookup ───────────────────────────────────────────────────

export async function findNearestCoast(userLat: number, userLng: number): Promise<CoastResult | null> {
  const radii = [10000, 25000, 50000, 100000];

  for (const radius of radii) {
    const query = `
      [out:json][timeout:25];
      (
        node["natural"="beach"](around:${radius},${userLat},${userLng});
        node["natural"="coastline"](around:${radius},${userLat},${userLng});
        node["harbour"="yes"](around:${radius},${userLat},${userLng});
        node["seamark:type"="harbour"](around:${radius},${userLat},${userLng});
        way["natural"="beach"](around:${radius},${userLat},${userLng});
        way["natural"="coastline"](around:${radius},${userLat},${userLng});
      );
      out tags center 20;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    const data = await res.json();

    if (data.elements && data.elements.length > 0) {
      type OverpassElement = {
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string };
      };

      const sorted = (data.elements as OverpassElement[])
        .map((e) => ({
          lat: e.lat ?? e.center?.lat,
          lon: e.lon ?? e.center?.lon,
          name: e.tags?.name,
        }))
        .filter((e): e is { lat: number; lon: number; name: string | undefined } =>
          e.lat != null && e.lon != null
        )
        .map((e) => ({
          name: e.name ?? "Coastal Area",
          lat: e.lat,
          lng: e.lon,
          distance_km: getDistanceKm(userLat, userLng, e.lat, e.lon),
        }))
        .sort((a, b) => a.distance_km - b.distance_km);

      return sorted[0] ?? null;
    }
  }

  return null;
}

// ── Geolocation wrapper ───────────────────────────────────────────────────────

export function getLocationCoast(): Promise<LocationCoastResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ coords: null, coast: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          const coast = await findNearestCoast(coords.lat, coords.lng);
          resolve({ coords, coast });
        } catch {
          resolve({ coords, coast: null });
        }
      },
      () => resolve({ coords: null, coast: null }),
      { timeout: 12000 }
    );
  });
}
