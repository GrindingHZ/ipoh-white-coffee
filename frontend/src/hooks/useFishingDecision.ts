import { useCallback, useEffect, useRef, useState } from "react";
import {
  BURST_ALPHA_DECAY,
  BURST_COLOR,
  BURST_EXPAND_SPEED,
  BURST_INITIAL_ALPHA,
  BURST_INITIAL_RADIUS,
  BURST_LINE_WIDTH,
  CANVAS_BG,
  COLOR_INNER,
  COLOR_LERP_EXPONENT,
  COLOR_OUTER,
  FAKE_BACKEND_DELAY_MS,
  LOADING_STEPS,
  REVEAL_BURST_MS,
  REVEAL_MAP_MS,
  REVEAL_METRICS_MS,
  REVEAL_SEE_MORE_MS,
  RING_BASE_ALPHA,
  RING_FADE_EXPONENT,
  RING_FADE_START,
  RING_LINE_WIDTH_BASE,
  RING_LINE_WIDTH_EXTRA,
  RING_STEPS,
  WAVE1_AMP,
  WAVE1_FREQ,
  WAVE1_SPEED,
  WAVE2_AMP,
  WAVE2_FREQ,
  WAVE2_SPEED,
  WAVE3_AMP,
  WAVE3_FREQ,
  WAVE3_SPEED,
  WAVE_EXPAND_SPEED,
  WAVE_INITIAL_RADIUS,
  WAVE_LOADING_SPAWN_INTERVAL_MS,
  WAVE_MIN_RADIUS,
  WAVE_SCALE_MULTIPLIER,
  WAVE_TIME_STEP,
} from "../constants";
import { getLocationCoast, getRecommendation } from "../services/api";
import type { CoastResult, RecommendationResponse } from "../services/api";
import type { Burst, Wave } from "../types";
import { lerpColor } from "../utils/format";

export function useFishingDecision() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavesRef = useRef<Wave[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const tRef = useRef(0);
  const animRef = useRef<number>(0);
  const loadingIntervalRef = useRef<number | null>(null);
  const loadingStepRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);
  const [burstComplete, setBurstComplete] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [seeMoreReady, setSeeMoreReady] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestCoast, setNearestCoast] = useState<CoastResult | null>(null);

  // ── Canvas wave/burst draw loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) + 30;

    function drawRing(baseR: number, t: number) {
      if (baseR < WAVE_MIN_RADIUS) return;
      const prog = Math.min(baseR / maxR, 1);
      const alpha =
        prog < RING_FADE_START
          ? RING_BASE_ALPHA
          : RING_BASE_ALPHA *
            (1 - Math.pow((prog - RING_FADE_START) / (1 - RING_FADE_START), RING_FADE_EXPONENT));

      if (alpha <= 0.01) return;

      const [r, g, b] = lerpColor(...COLOR_INNER, ...COLOR_OUTER, Math.pow(prog, COLOR_LERP_EXPONENT));

      ctx!.beginPath();
      for (let s = 0; s <= RING_STEPS; s += 1) {
        const angle = (s / RING_STEPS) * Math.PI * 2;
        const waveScale = Math.sin(prog * Math.PI) * WAVE_SCALE_MULTIPLIER;
        const w1 = Math.sin(angle * WAVE1_FREQ + t * WAVE1_SPEED) * waveScale * WAVE1_AMP;
        const w2 = Math.sin(angle * WAVE2_FREQ - t * WAVE2_SPEED) * waveScale * WAVE2_AMP;
        const w3 = Math.sin(angle * WAVE3_FREQ + t * WAVE3_SPEED) * waveScale * WAVE3_AMP;
        const rad = baseR + w1 + w2 + w3;
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad;
        s === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }

      ctx!.closePath();
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      ctx!.lineWidth = RING_LINE_WIDTH_BASE + (1 - prog) * RING_LINE_WIDTH_EXTRA;
      ctx!.stroke();
    }

    function drawBurst(burst: Burst) {
      ctx!.beginPath();
      ctx!.arc(cx, cy, burst.r, 0, Math.PI * 2);
      ctx!.strokeStyle = BURST_COLOR;
      ctx!.globalAlpha = burst.alpha;
      ctx!.lineWidth = BURST_LINE_WIDTH;
      ctx!.stroke();
      ctx!.globalAlpha = 1;
    }

    function loop() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = CANVAS_BG;
      ctx!.fillRect(0, 0, W, H);

      wavesRef.current = wavesRef.current.filter((w) => w.r < maxR);
      for (const wave of wavesRef.current) {
        drawRing(wave.r, tRef.current);
        wave.r += WAVE_EXPAND_SPEED;
      }

      burstsRef.current = burstsRef.current.filter((b) => b.alpha > 0.01);
      for (const burst of burstsRef.current) {
        drawBurst(burst);
        burst.r += BURST_EXPAND_SPEED;
        burst.alpha *= BURST_ALPHA_DECAY;
      }

      tRef.current += WAVE_TIME_STEP;
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // ── Loading ripple ──────────────────────────────────────────────────────────
  const startLoadingRipple = useCallback(() => {
    wavesRef.current.push({ r: WAVE_INITIAL_RADIUS });
    loadingIntervalRef.current = window.setInterval(() => {
      wavesRef.current.push({ r: WAVE_INITIAL_RADIUS });
    }, WAVE_LOADING_SPAWN_INTERVAL_MS);

    setLoadingStep(0);
    const stepMs = FAKE_BACKEND_DELAY_MS / LOADING_STEPS.length;
    loadingStepRef.current = window.setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, stepMs);
  }, []);

  const stopLoadingRipple = useCallback(() => {
    if (loadingIntervalRef.current !== null) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    if (loadingStepRef.current !== null) {
      clearInterval(loadingStepRef.current);
      loadingStepRef.current = null;
    }
  }, []);

  const spawnBurst = useCallback(() => {
    wavesRef.current = [];
    burstsRef.current.push({ r: BURST_INITIAL_RADIUS, alpha: BURST_INITIAL_ALPHA });
  }, []);

  // ── Decision flow ───────────────────────────────────────────────────────────
  const fetchDecision = useCallback(async () => {
    if (isLoading || hasChecked) return;
    setIsLoading(true);
    setRecommendationError(null);
    startLoadingRipple();

    try {
      const [decisionJson, locationResult] = await Promise.all([
        getRecommendation(),
        getLocationCoast(),
      ]);

      setRecommendation(decisionJson);
      setUserCoords(locationResult.coords);
      setNearestCoast(locationResult.coast);
      spawnBurst();
      setHasChecked(true);

      // Reveal results sequentially after burst plays out
      window.setTimeout(() => {
        setBurstComplete(true);
        setShowVerdict(true);
      }, REVEAL_BURST_MS);
      window.setTimeout(() => setShowMap(true), REVEAL_MAP_MS);
      window.setTimeout(() => setShowMetrics(true), REVEAL_METRICS_MS);
      window.setTimeout(() => setSeeMoreReady(true), REVEAL_SEE_MORE_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Recommendation request failed";
      setRecommendationError(message);
    } finally {
      stopLoadingRipple();
      setIsLoading(false);
    }
  }, [isLoading, hasChecked, spawnBurst, startLoadingRipple, stopLoadingRipple]);

  const reset = useCallback(() => {
    setHasChecked(false);
    setBurstComplete(false);
    setShowVerdict(false);
    setShowMap(false);
    setShowMetrics(false);
    setSeeMoreReady(false);
    setRecommendation(null);
    setRecommendationError(null);
  }, []);

  return {
    canvasRef,
    isLoading,
    loadingStep,
    hasChecked,
    burstComplete,
    showVerdict,
    showMap,
    showMetrics,
    seeMoreReady,
    recommendation,
    recommendationError,
    userCoords,
    nearestCoast,
    fetchDecision,
    reset,
  };
}
