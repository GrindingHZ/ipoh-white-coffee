// ── Canvas ────────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH = 520;
export const CANVAS_HEIGHT = 420;

// ── Wave animation ────────────────────────────────────────────────────────────
export const WAVE_MIN_RADIUS = 42;
export const WAVE_INITIAL_RADIUS = 48;
export const WAVE_SPAWN_COUNT = 8;
export const WAVE_SPAWN_INTERVAL_MS = 170;
export const WAVE_EXPAND_SPEED = 0.42;
export const WAVE_TIME_STEP = 0.022;
export const WAVE_HOVER_RADIUS = 58;

// Interval (ms) between each new wave ring while the backend is processing
export const WAVE_LOADING_SPAWN_INTERVAL_MS = 600;

// Simulated backend response delay (ms) — replace with real API call later
export const FAKE_BACKEND_DELAY_MS = 3500;

// ── Celebratory burst ring ────────────────────────────────────────────────────
export const BURST_INITIAL_RADIUS = 10;
export const BURST_EXPAND_SPEED = 6;
export const BURST_LINE_WIDTH = 5;
export const BURST_COLOR = "#22c55e";
export const BURST_INITIAL_ALPHA = 1.0;
export const BURST_ALPHA_DECAY = 0.97;


// ── Ring rendering ────────────────────────────────────────────────────────────
export const RING_STEPS = 340;
export const RING_FADE_START = 0.52;
export const RING_BASE_ALPHA = 0.84;
export const RING_FADE_EXPONENT = 1.7;
export const RING_LINE_WIDTH_BASE = 1.4;
export const RING_LINE_WIDTH_EXTRA = 1.2;

// ── Wave shape ────────────────────────────────────────────────────────────────
export const WAVE_SCALE_MULTIPLIER = 1.05;
export const WAVE1_FREQ = 4;
export const WAVE1_SPEED = 1.8;
export const WAVE1_AMP = 14;
export const WAVE2_FREQ = 7;
export const WAVE2_SPEED = 1.2;
export const WAVE2_AMP = 7;
export const WAVE3_FREQ = 2;
export const WAVE3_SPEED = 0.6;
export const WAVE3_AMP = 10;

// ── Color lerp: teal → amber ──────────────────────────────────────────────────
export const COLOR_INNER: [number, number, number] = [30, 184, 166];
export const COLOR_OUTER: [number, number, number] = [245, 158, 11];
export const COLOR_LERP_EXPONENT = 0.75;

// ── Background fill ───────────────────────────────────────────────────────────
export const CANVAS_BG = "rgba(8, 32, 38, 0.72)";

// ── Temporary UI data ─────────────────────────────────────────────────────────
// BACKEND TODO:
// The values below are currently hardcoded placeholders for the Check / See more
// result. When the decision API is ready, replace these arrays with fields from
// the backend JSON response instead of importing static data into App.tsx.
//
// Suggested response shape:
// {
//   "metrics": [{ "label": "Decision", "value": "Go", "tone": "good" }],
//   "buyers": [{ "name": "Koperasi Jeti", "price": "RM9.80/kg", "distance": "2.1 km", "net": "RM284" }],
//   "weeklyInsights": ["Trips after light east wind returned 18% higher net income."],
//   "ambientConditions": [{ "icon": "🌊", "label": "Tide", "value": "Low · 0.4 m", "sub": "Next high 11:20 AM" }]
// }
export interface Metric {
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
}

export const TRIP_METRICS: Metric[] = [
  { label: "Decision", value: "Go", tone: "good" },
  { label: "Zone", value: "Pantai Remis", tone: "neutral" },
  { label: "Expected Net", value: "+RM46", tone: "good" },
];

export const BUYER_ROWS = [
  { name: "Koperasi Jeti", price: "RM9.80/kg", distance: "2.1 km", net: "RM284" },
  { name: "Pasar Pagi", price: "RM10.40/kg", distance: "7.4 km", net: "RM271" },
  { name: "Middleman A", price: "RM8.90/kg", distance: "0.8 km", net: "RM252" },
];

export const WEEKLY_INSIGHTS = [
  "Trips after light east wind returned 18% higher net income.",
  "Fuel cost crossed RM38 on two low-catch days.",
  "Best margin came from selling ikan kembung before 9:30 AM.",
];

export const AMBIENT_CONDITIONS = [
  { icon: "🌊", label: "Tide", value: "Low · 0.4 m", sub: "Next high 11:20 AM" },
  { icon: "🌤", label: "Weather", value: "22°C Partly cloudy", sub: "Wind 12 km/h NE" },
] as const;

export const LOADING_STEPS = [
  "Checking tides…",
  "Checking weather…",
  "Checking market prices…",
  "Crunching the numbers…",
] as const;
