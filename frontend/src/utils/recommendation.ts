import { AMBIENT_CONDITIONS, TRIP_METRICS } from "../constants";
import type { Metric } from "../constants";
import type { RecommendationResponse } from "../services/api";
import type { AmbientCondition } from "../types";
import { formatPercent, titleCase } from "./format";

export function getRecommendationConditions(
  result: RecommendationResponse | null,
): AmbientCondition[] {
  if (!result?.analysis) return [...AMBIENT_CONDITIONS];

  const indicators = result.analysis.indicators ?? [];
  const weather = indicators.find((item) => item.indicator?.toLowerCase() === "weather");
  const tide = indicators.find((item) => item.indicator?.toLowerCase() === "tide");

  return [
    {
      icon: "🌊",
      label: "Tide",
      value: tide ? `${formatPercent(tide.score)} Tide` : "Tide unknown",
      sub: tide?.summary ?? "No tide signal returned",
    },
    {
      icon: "🌤",
      label: "Weather",
      value: weather ? `${formatPercent(weather.score)} Weather` : "Weather unknown",
      sub: weather?.summary ?? "No weather signal returned",
    },
  ];
}

export function buildTripMetrics(
  recommendation: RecommendationResponse | null,
  selectedZoneName: string,
): Metric[] {
  if (!recommendation) {
    return TRIP_METRICS.map((metric) =>
      metric.label === "Zone" ? { ...metric, value: selectedZoneName } : metric,
    );
  }

  const analysis = recommendation.analysis;
  const risk = analysis?.riskLevel ?? "unknown";
  const shouldFish = analysis?.shouldFishToday ?? recommendation.verdict === "GO";
  const profitConfidence = analysis?.profitConfidence ?? 0;

  return [
    {
      label: "Decision",
      value: recommendation.verdict.replace("_", " "),
      tone: shouldFish ? "good" : "warn",
    },
    {
      label: "Confidence",
      value: formatPercent(analysis?.profitConfidence),
      tone: profitConfidence >= 0.65 ? "good" : "neutral",
    },
    {
      label: "Risk",
      value: titleCase(risk),
      tone: risk.toLowerCase() === "low" ? "good" : "warn",
    },
  ];
}
