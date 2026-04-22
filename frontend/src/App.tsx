import React, { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import "./styles.css";
import heroBg from "./assets/fisheriq-hero.png";
import { getLocationCoast } from "./services/api";
import type { CoastResult } from "./services/api";
import { useScrollNav } from "./hooks/useScrollNav";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  WAVE_MIN_RADIUS,
  WAVE_INITIAL_RADIUS,
  WAVE_SPAWN_COUNT,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_EXPAND_SPEED,
  WAVE_TIME_STEP,
  WAVE_HOVER_RADIUS,
  WAVE_LOADING_SPAWN_INTERVAL_MS,
  FAKE_BACKEND_DELAY_MS,
  BURST_INITIAL_RADIUS,
  BURST_EXPAND_SPEED,
  BURST_LINE_WIDTH,
  BURST_COLOR,
  BURST_INITIAL_ALPHA,
  BURST_ALPHA_DECAY,
  CANVAS_BG,
  RING_STEPS,
  RING_FADE_START,
  RING_BASE_ALPHA,
  RING_FADE_EXPONENT,
  RING_LINE_WIDTH_BASE,
  RING_LINE_WIDTH_EXTRA,
  WAVE_SCALE_MULTIPLIER,
  WAVE1_FREQ, WAVE1_SPEED, WAVE1_AMP,
  WAVE2_FREQ, WAVE2_SPEED, WAVE2_AMP,
  WAVE3_FREQ, WAVE3_SPEED, WAVE3_AMP,
  COLOR_INNER,
  COLOR_OUTER,
  COLOR_LERP_EXPONENT,
  TRIP_METRICS,
  BUYER_ROWS,
  WEEKLY_INSIGHTS,
} from "./constants";

interface Wave {
  r: number;
}

interface Burst {
  r: number;
  alpha: number;
}


function lerpColor(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  p: number
): [number, number, number] {
  return [
    Math.round(r1 + (r2 - r1) * p),
    Math.round(g1 + (g2 - g1) * p),
    Math.round(b1 + (b2 - b1) * p),
  ];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavesRef = useRef<Wave[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const tRef = useRef(0);
  const animRef = useRef<number>(0);
  const loadingIntervalRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [seeMoreReady, setSeeMoreReady] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestCoast, setNearestCoast] = useState<CoastResult | null>(null);
  const { navHidden, navHovered, setNavHovered, appScreenRef } = useScrollNav();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

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
          : RING_BASE_ALPHA * (1 - Math.pow((prog - RING_FADE_START) / (1 - RING_FADE_START), RING_FADE_EXPONENT));

      if (alpha <= 0.01) return;

      const [r, g, b] = lerpColor(...COLOR_INNER, ...COLOR_OUTER, Math.pow(prog, COLOR_LERP_EXPONENT));

      ctx.beginPath();
      for (let s = 0; s <= RING_STEPS; s += 1) {
        const angle = (s / RING_STEPS) * Math.PI * 2;
        const waveScale = Math.sin(prog * Math.PI) * WAVE_SCALE_MULTIPLIER;
        const w1 = Math.sin(angle * WAVE1_FREQ + t * WAVE1_SPEED) * waveScale * WAVE1_AMP;
        const w2 = Math.sin(angle * WAVE2_FREQ - t * WAVE2_SPEED) * waveScale * WAVE2_AMP;
        const w3 = Math.sin(angle * WAVE3_FREQ + t * WAVE3_SPEED) * waveScale * WAVE3_AMP;
        const rad = baseR + w1 + w2 + w3;
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = RING_LINE_WIDTH_BASE + (1 - prog) * RING_LINE_WIDTH_EXTRA;
      ctx.stroke();
    }

    function drawBurst(burst: Burst) {
      ctx.beginPath();
      ctx.arc(cx, cy, burst.r, 0, Math.PI * 2);
      ctx.strokeStyle = BURST_COLOR;
      ctx.globalAlpha = burst.alpha;
      ctx.lineWidth = BURST_LINE_WIDTH;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, W, H);

      wavesRef.current = wavesRef.current.filter((w) => w.r < maxR);
      for (const w of wavesRef.current) {
        drawRing(w.r, tRef.current);
        w.r += WAVE_EXPAND_SPEED;
      }

      burstsRef.current = burstsRef.current.filter((b) => b.alpha > 0.01);
      for (const b of burstsRef.current) {
        drawBurst(b);
        b.r += BURST_EXPAND_SPEED;
        b.alpha *= BURST_ALPHA_DECAY;
      }

      tRef.current += WAVE_TIME_STEP;
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function spawnBurst() {
    burstsRef.current.push({ r: BURST_INITIAL_RADIUS, alpha: BURST_INITIAL_ALPHA });
  }

  function spawnWaves() {
    for (let i = 0; i < WAVE_SPAWN_COUNT; i += 1) {
      window.setTimeout(() => {
        wavesRef.current.push({ r: WAVE_INITIAL_RADIUS });
      }, i * WAVE_SPAWN_INTERVAL_MS);
    }
  }

  function startLoadingRipple() {
    // Spawn an initial burst then keep adding one ring at a steady interval
    wavesRef.current.push({ r: WAVE_INITIAL_RADIUS });
    loadingIntervalRef.current = window.setInterval(() => {
      wavesRef.current.push({ r: WAVE_INITIAL_RADIUS });
    }, WAVE_LOADING_SPAWN_INTERVAL_MS);
  }

  function stopLoadingRipple() {
    if (loadingIntervalRef.current !== null) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }

  async function fetchDecision() {
    if (isLoading || hasChecked) return;
    setIsLoading(true);
    startLoadingRipple();

    // Run backend call + geolocation lookup in parallel
    const [, locationResult] = await Promise.all([
      // TODO: replace with real API call — await api.getDecision()
      new Promise<void>((resolve) => setTimeout(resolve, FAKE_BACKEND_DELAY_MS)),
      getLocationCoast(),
    ]);

    setUserCoords(locationResult.coords);
    setNearestCoast(locationResult.coast);
    stopLoadingRipple();
    spawnBurst();
    setIsLoading(false);
    setHasChecked(true);
    // Show "See more" after all 3 cards finish floating up (1000ms delay + 1400ms duration + buffer)
    window.setTimeout(() => setSeeMoreReady(true), 2600);
  }

  function handleMouseMove(e: MouseEvent<HTMLCanvasElement>) {
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
    if (!hasChecked && !isLoading) {
      fetchDecision();
    }
  }

  return (
    <main className="app-shell" style={{ "--hero-bg": `url(${heroBg})` } as React.CSSProperties}>
      {/* Invisible strip at top edge — hover here to peek the nav */}
      <div
        className="nav-hover-zone"
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
      />

      <nav
        className={navHidden && !navHovered ? "app-bar app-bar--hidden" : "app-bar"}
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
        aria-label="FisherIQ app bar"
      >
        <button className="icon-button" type="button" aria-label="Open menu">
          <span aria-hidden="true">☰</span>
        </button>
        <div className="app-title">
          <span>FisherIQ</span>
          <strong>Today</strong>
        </div>
        <button className="icon-button" type="button" aria-label="Refresh decision">
          <span aria-hidden="true">↻</span>
        </button>
      </nav>

      <section ref={appScreenRef} className="app-screen" aria-label="FisherIQ daily dashboard">
        <aside className="decision-panel" aria-label="FisherIQ daily decision">
          <div className="panel-heading">
            <div>
              <span>6:30 AM</span>
              <strong>Decision Zone</strong>
            </div>
            <span className="weather-chip">Calm sea</span>
          </div>

          <div
            className={hasChecked ? "signal-stage signal-stage--result" : "signal-stage"}
            onClick={handleStageClick}
          >
            {/* Canvas — hidden after the decision is revealed */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHovered(false)}
              className={
                hasChecked
                  ? "signal-canvas signal-canvas--hidden"
                  : hovered
                    ? "signal-canvas is-hovered"
                    : "signal-canvas"
              }
            />

            {!hasChecked && (
              <button
                className={
                  isLoading
                    ? "pulse-button is-loading"
                    : hovered
                      ? "pulse-button is-hovered"
                      : "pulse-button"
                }
                type="button"
                disabled={isLoading}
                onClick={(event) => {
                  event.stopPropagation();
                  fetchDecision();
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                <span aria-hidden="true">{isLoading ? "⏳" : "▶"}</span>
                {isLoading ? "Checking…" : "Check"}
              </button>
            )}

            {hasChecked && (() => {
              const mapTarget = nearestCoast ?? userCoords;
              const mapSrc = mapTarget
                ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapTarget.lng - 0.06},${mapTarget.lat - 0.06},${mapTarget.lng + 0.06},${mapTarget.lat + 0.06}&layer=mapnik&marker=${mapTarget.lat},${mapTarget.lng}`
                : null;
              return (
                <>
                  {mapSrc && (
                    <div className="coast-map-section">
                      <div className="coast-map-header">
                        <span>⚓</span>
                        <strong>{nearestCoast ? nearestCoast.name : "Your Location"}</strong>
                        {nearestCoast && <em>{nearestCoast.distance_km.toFixed(1)} km away</em>}
                      </div>
                      <iframe
                        className="coast-map-frame"
                        title={nearestCoast ? nearestCoast.name : "Your location"}
                        src={mapSrc}
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="decision-overlay decision-overlay--static" aria-live="polite">
                    {TRIP_METRICS.map((metric) => (
                      <div className="metric" key={metric.label}>
                        <span>{metric.label}</span>
                        <strong className={metric.tone}>{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="panel-actions">
            {seeMoreReady ? (
              <button
                className="see-more-button"
                type="button"
                onClick={() => setShowMore((current) => !current)}
              >
                {showMore ? "Hide more" : "See more"}
              </button>
            ) : (
              <p>{hasChecked ? "\u00a0" : "Tap Check to see today's fishing decision."}</p>
            )}
          </div>

          {showMore && (
            <div className="details-area">
              <div className="dashboard-grid">
                <article className="feature-card">
                  <div className="card-topline">
                    <span className="icon-chip">☀</span>
                    <span>Trip Engine</span>
                  </div>
                  <h3>Go fishing at 6:30 AM</h3>
                  <p>
                    Low rain risk, moderate fuel cost, and stronger catch history near
                    Pantai Remis make the trip profitable.
                  </p>
                  <div className="profit-strip">
                    <span>Without FisherIQ</span>
                    <strong className="warn">-RM12</strong>
                    <span>With FisherIQ</span>
                    <strong className="good">+RM46</strong>
                  </div>
                </article>

                <article className="feature-card" id="market">
                  <div className="card-topline">
                    <span className="icon-chip">RM</span>
                    <span>Market Engine</span>
                  </div>
                  <h3>Best buyer: Koperasi Jeti</h3>
                  <div className="buyer-table">
                    {BUYER_ROWS.map((buyer) => (
                      <div className="buyer-row" key={buyer.name}>
                        <span>{buyer.name}</span>
                        <span>{buyer.price}</span>
                        <span>{buyer.distance}</span>
                        <strong>{buyer.net}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="feature-card log-card" id="insights">
                  <div className="card-topline">
                    <span className="icon-chip">✎</span>
                    <span>Catch Log</span>
                  </div>
                  <h3>Natural language input</h3>
                  <div className="message-bubble">
                    "Hari ni dapat 18kg kembung, minyak RM42, jual dekat koperasi."
                  </div>
                  <p>
                    GLM turns the message into structured catch, cost, buyer, and income data.
                  </p>
                </article>
              </div>

              <div className="insight-list">
                {WEEKLY_INSIGHTS.map((insight) => (
                  <div className="insight-item" key={insight}>
                    <span aria-hidden="true">✓</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
