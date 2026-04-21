import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import "./styles.css";

interface Wave {
  r: number;
}

interface Metric {
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
}

const tripMetrics: Metric[] = [
  { label: "Decision", value: "Go", tone: "good" },
  { label: "Zone", value: "Pantai Remis", tone: "neutral" },
  { label: "Expected Net", value: "+RM46", tone: "good" },
];

const buyerRows = [
  { name: "Koperasi Jeti", price: "RM9.80/kg", distance: "2.1 km", net: "RM284" },
  { name: "Pasar Pagi", price: "RM10.40/kg", distance: "7.4 km", net: "RM271" },
  { name: "Middleman A", price: "RM8.90/kg", distance: "0.8 km", net: "RM252" },
];

const weeklyInsights = [
  "Trips after light east wind returned 18% higher net income.",
  "Fuel cost crossed RM38 on two low-catch days.",
  "Best margin came from selling ikan kembung before 9:30 AM.",
];

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
  const wavesRef = useRef<Wave[]>([{ r: 58 }, { r: 150 }, { r: 242 }]);
  const tRef = useRef(0);
  const animRef = useRef<number>(0);
  const [hovered, setHovered] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [showMore, setShowMore] = useState(false);

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
      if (baseR < 42) return;
      const prog = Math.min(baseR / maxR, 1);
      const fadeStart = 0.52;
      const alpha =
        prog < fadeStart
          ? 0.84
          : 0.84 * (1 - Math.pow((prog - fadeStart) / (1 - fadeStart), 1.7));

      if (alpha <= 0.01) return;

      const [r, g, b] = lerpColor(30, 184, 166, 245, 158, 11, Math.pow(prog, 0.75));
      const steps = 340;

      ctx.beginPath();
      for (let s = 0; s <= steps; s += 1) {
        const angle = (s / steps) * Math.PI * 2;
        const waveScale = Math.sin(prog * Math.PI) * 1.05;
        const w1 = Math.sin(angle * 4 + t * 1.8) * waveScale * 14;
        const w2 = Math.sin(angle * 7 - t * 1.2) * waveScale * 7;
        const w3 = Math.sin(angle * 2 + t * 0.6) * waveScale * 10;
        const rad = baseR + w1 + w2 + w3;
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.4 + (1 - prog) * 1.2;
      ctx.stroke();
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8, 32, 38, 0.72)";
      ctx.fillRect(0, 0, W, H);

      wavesRef.current = wavesRef.current.filter((w) => w.r < maxR);
      if (wavesRef.current.length < 3) {
        wavesRef.current.push({ r: 48 });
      }

      for (const w of wavesRef.current) {
        drawRing(w.r, tRef.current);
        w.r += 0.42;
      }

      tRef.current += 0.022;
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function spawnWaves() {
    for (let i = 0; i < 8; i += 1) {
      window.setTimeout(() => {
        wavesRef.current.push({ r: 48 });
      }, i * 170);
    }
  }

  function revealDecision() {
    setHasChecked(true);
    spawnWaves();
  }

  function handleMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const dx = (e.clientX - rect.left) * sx - canvas.width / 2;
    const dy = (e.clientY - rect.top) * sy - canvas.height / 2;
    setHovered(Math.sqrt(dx * dx + dy * dy) < 58);
  }

  function handleStageClick() {
    if (!hasChecked) {
      revealDecision();
      return;
    }

    spawnWaves();
  }

  return (
    <main className="app-shell">
      <nav className="app-bar" aria-label="FisherIQ app bar">
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

      <section className="app-screen" aria-label="FisherIQ daily dashboard">
        <aside className="decision-panel" aria-label="FisherIQ daily decision">
          <div className="panel-heading">
            <div>
              <span>6:30 AM</span>
              <strong>Decision Zone</strong>
            </div>
            <span className="weather-chip">Calm sea</span>
          </div>

          <div className="signal-stage" onClick={handleStageClick}>
            <canvas
              ref={canvasRef}
              width={520}
              height={420}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHovered(false)}
              className={hovered ? "signal-canvas is-hovered" : "signal-canvas"}
            />
            <button
              className={
                hasChecked
                  ? "pulse-button is-checked"
                  : hovered
                    ? "pulse-button is-hovered"
                    : "pulse-button"
              }
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                revealDecision();
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <span aria-hidden="true">▶</span>
              {hasChecked ? "Checked" : "Check"}
            </button>

            {hasChecked && (
              <div className="decision-overlay" aria-live="polite">
                {tripMetrics.map((metric) => (
                  <div className="metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong className={metric.tone}>{metric.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-actions">
            {hasChecked ? (
              <button
                className="see-more-button"
                type="button"
                onClick={() => setShowMore((current) => !current)}
              >
                {showMore ? "Hide more" : "See more"}
              </button>
            ) : (
              <p>Tap Check to see today's fishing decision.</p>
            )}
          </div>
        </aside>

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
                  {buyerRows.map((buyer) => (
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
                  “Hari ni dapat 18kg kembung, minyak RM42, jual dekat koperasi.”
                </div>
                <p>
                  GLM turns the message into structured catch, cost, buyer, and income data.
                </p>
              </article>
            </div>

            <div className="insight-list">
              {weeklyInsights.map((insight) => (
                <div className="insight-item" key={insight}>
                  <span aria-hidden="true">✓</span>
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
