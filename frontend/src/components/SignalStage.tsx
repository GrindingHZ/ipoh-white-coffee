import { useState } from "react";
import type { MouseEvent, RefObject } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LOADING_STEPS,
  METRIC_STAGGER_MS,
  WAVE_HOVER_RADIUS,
} from "../constants";
import type { Metric } from "../constants";
import type { CoastResult, RecommendationResponse } from "../services/api";
import { buildOsmEmbedUrl } from "../utils/format";

interface SignalStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  loadingStep: number;
  hasChecked: boolean;
  burstComplete: boolean;
  showVerdict: boolean;
  showMap: boolean;
  showMetrics: boolean;
  recommendation: RecommendationResponse | null;
  userCoords: { lat: number; lng: number } | null;
  nearestCoast: CoastResult | null;
  metrics: Metric[];
  onCheck: () => void;
}

function VerdictBadge({ recommendation }: { recommendation: RecommendationResponse | null }) {
  const verdict = recommendation?.verdict ?? "GO";
  const isGo = verdict === "GO";
  const className = isGo ? "verdict-badge verdict-badge--go" : "verdict-badge verdict-badge--stay";
  const label = isGo ? "GO FISH" : verdict === "ERROR" ? "TRY AGAIN" : "STAY HOME";
  const sub = recommendation?.reason ?? (isGo ? "Conditions are good today" : "Not worth the trip today");

  return (
    <div className={`${className} reveal-slide`} aria-live="polite">
      <span className="verdict-icon">{isGo ? "✓" : "✕"}</span>
      <span className="verdict-label">{label}</span>
      <span className="verdict-sub">{sub}</span>
    </div>
  );
}

function CoastMap({
  userCoords,
  nearestCoast,
}: {
  userCoords: { lat: number; lng: number } | null;
  nearestCoast: CoastResult | null;
}) {
  const target = nearestCoast ?? userCoords;
  if (!target) return null;
  const src = buildOsmEmbedUrl(target.lat, target.lng);
  const title = nearestCoast ? nearestCoast.name : "Your location";

  return (
    <div className="coast-map-section reveal-slide">
      <div className="coast-map-header">
        <span>⚓</span>
        <strong>{nearestCoast ? nearestCoast.name : "Your Location"}</strong>
        {nearestCoast && <em>{nearestCoast.distance_km.toFixed(1)} km away</em>}
      </div>
      <iframe className="coast-map-frame" title={title} src={src} allowFullScreen loading="lazy" />
    </div>
  );
}

function MetricsRow({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="decision-overlay decision-overlay--static" aria-live="polite">
      {metrics.map((metric, i) => (
        <div
          className="metric reveal-slide"
          key={metric.label}
          style={{ animationDelay: `${i * METRIC_STAGGER_MS}ms` }}
        >
          <span>{metric.label}</span>
          <strong className={metric.tone}>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function SignalStage(props: SignalStageProps) {
  const {
    canvasRef,
    isLoading,
    loadingStep,
    hasChecked,
    burstComplete,
    showVerdict,
    showMap,
    showMetrics,
    recommendation,
    userCoords,
    nearestCoast,
    metrics,
    onCheck,
  } = props;

  const [hovered, setHovered] = useState(false);
  const resultsReady = hasChecked && burstComplete;

  function handleCanvasMove(e: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const dx = (e.clientX - rect.left) * sx - canvas.width / 2;
    const dy = (e.clientY - rect.top) * sy - canvas.height / 2;
    setHovered(Math.sqrt(dx * dx + dy * dy) < WAVE_HOVER_RADIUS);
  }

  function handleStageClick() {
    if (!hasChecked && !isLoading) onCheck();
  }

  const canvasClass = resultsReady
    ? "signal-canvas signal-canvas--hidden"
    : hovered
      ? "signal-canvas is-hovered"
      : "signal-canvas";

  const buttonClass = isLoading
    ? "pulse-button is-loading"
    : hovered
      ? "pulse-button is-hovered"
      : "pulse-button";

  return (
    <div
      className={resultsReady ? "signal-stage signal-stage--result" : "signal-stage"}
      onClick={handleStageClick}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHovered(false)}
        className={canvasClass}
      />

      {!hasChecked && (
        <button
          className={buttonClass}
          type="button"
          disabled={isLoading}
          onClick={(event) => {
            event.stopPropagation();
            onCheck();
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span aria-hidden="true">{isLoading ? "⏳" : "▶"}</span>
          {isLoading ? LOADING_STEPS[loadingStep] : "Check"}
        </button>
      )}

      {resultsReady && (
        <>
          {showVerdict && <VerdictBadge recommendation={recommendation} />}
          {showMap && <CoastMap userCoords={userCoords} nearestCoast={nearestCoast} />}
          {showMetrics && <MetricsRow metrics={metrics} />}
        </>
      )}
    </div>
  );
}
