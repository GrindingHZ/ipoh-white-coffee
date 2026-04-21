import React, { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BORDER_RADIUS,
  CONTAINER_WIDTH,
  CONTAINER_HEIGHT,
  WAVE_SPAWN_COUNT,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_INITIAL_RADIUS,
  WAVE_EXPAND_SPEED,
  WAVE_TIME_STEP,
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
  PLAY_BUTTON_SIZE,
  PLAY_BUTTON_HIT_RADIUS,
  PLAY_BUTTON_HOVER_SCALE,
  PLAY_BUTTON_COLOR,
} from "./constants.ts";

interface Wave {
  r: number;
}

function lerpColor(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
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
  const tRef = useRef(0);
  const animRef = useRef<number>(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) + 20;

    function drawRing(baseR: number, t: number) {
      if (!ctx || baseR < WAVE_INITIAL_RADIUS) return;
      const prog = Math.min(baseR / maxR, 1);

      const alpha =
        prog < RING_FADE_START
          ? RING_BASE_ALPHA
          : RING_BASE_ALPHA *
            (1 -
              Math.pow(
                (prog - RING_FADE_START) / (1 - RING_FADE_START),
                RING_FADE_EXPONENT
              ));
      if (alpha <= 0.01) return;

      const [r, g, b] = lerpColor(
        ...COLOR_INNER,
        ...COLOR_OUTER,
        Math.pow(prog, COLOR_LERP_EXPONENT)
      );

      ctx.beginPath();
      for (let s = 0; s <= RING_STEPS; s++) {
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
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.lineWidth = RING_LINE_WIDTH_BASE + (1 - prog) * RING_LINE_WIDTH_EXTRA;
      ctx.stroke();
    }

    function loop() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      wavesRef.current = wavesRef.current.filter((w) => w.r < maxR);
      for (const w of wavesRef.current) {
        drawRing(w.r, tRef.current);
        w.r += WAVE_EXPAND_SPEED;
      }

      tRef.current += WAVE_TIME_STEP;
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function spawnWaves() {
    for (let i = 0; i < WAVE_SPAWN_COUNT; i++) {
      setTimeout(() => {
        wavesRef.current.push({ r: WAVE_INITIAL_RADIUS });
      }, i * WAVE_SPAWN_INTERVAL_MS);
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const dx = (e.clientX - rect.left) * sx - canvas.width / 2;
    const dy = (e.clientY - rect.top) * sy - canvas.height / 2;
    setHovered(Math.sqrt(dx * dx + dy * dy) < PLAY_BUTTON_HIT_RADIUS);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const dx = (e.clientX - rect.left) * sx - canvas.width / 2;
    const dy = (e.clientY - rect.top) * sy - canvas.height / 2;
    if (Math.sqrt(dx * dx + dy * dy) < PLAY_BUTTON_HIT_RADIUS) spawnWaves();
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: CANVAS_BORDER_RADIUS,
            cursor: hovered ? "pointer" : "default",
          }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        <div
          onClick={spawnWaves}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${hovered ? PLAY_BUTTON_HOVER_SCALE : 1.0})`,
            transition: "transform 0.15s ease",
            width: PLAY_BUTTON_SIZE,
            height: PLAY_BUTTON_SIZE,
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            userSelect: "none",
            gap: 4,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <polygon points="6,4 20,12 6,20" fill={PLAY_BUTTON_COLOR} />
          </svg>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: PLAY_BUTTON_COLOR,
              lineHeight: 1,
            }}
          >
            Watch
          </span>
        </div>
      </div>
    </div>
  );
}
