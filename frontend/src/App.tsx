import { useEffect, useRef, useState } from "react";

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
      if (!ctx || baseR < 52) return;
      const prog = Math.min(baseR / maxR, 1);

      const fadeStart = 0.45;
      const alpha =
        prog < fadeStart
          ? 0.92
          : 0.92 *
            (1 -
              Math.pow(
                (prog - fadeStart) / (1 - fadeStart),
                1.6
              ));
      if (alpha <= 0.01) return;

      const [r, g, b] = lerpColor(210, 0, 255, 30, 80, 255, Math.pow(prog, 0.7));

      const steps = 400;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const angle = (s / steps) * Math.PI * 2;
        const waveScale = Math.sin(prog * Math.PI) * 1.1;
        const w1 = Math.sin(angle * 4 + t * 1.8) * waveScale * 18;
        const w2 = Math.sin(angle * 7 - t * 1.2) * waveScale * 8;
        const w3 = Math.sin(angle * 2 + t * 0.6) * waveScale * 12;
        const rad = baseR + w1 + w2 + w3;
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.2 + (1 - prog) * 1.0;
      ctx.stroke();
    }

    function loop() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      wavesRef.current = wavesRef.current.filter((w) => w.r < maxR);
      for (const w of wavesRef.current) {
        drawRing(w.r, tRef.current);
        w.r += 0.55;
      }

      tRef.current += 0.025;
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function spawnWaves() {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        wavesRef.current.push({ r: 52 });
      }, i * 200);
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
    setHovered(Math.sqrt(dx * dx + dy * dy) < 54);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const dx = (e.clientX - rect.left) * sx - canvas.width / 2;
    const dy = (e.clientY - rect.top) * sy - canvas.height / 2;
    if (Math.sqrt(dx * dx + dy * dy) < 54) spawnWaves();
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
      <div style={{ position: "relative", width: 680, height: 540 }}>
        <canvas
          ref={canvasRef}
          width={680}
          height={540}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: 12,
            cursor: hovered ? "pointer" : "default",
          }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* Play button overlay — positioned via CSS over the canvas center */}
        <div
          onClick={spawnWaves}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${hovered ? 1.06 : 1.0})`,
            transition: "transform 0.15s ease",
            width: 96,
            height: 96,
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
          {/* Triangle play icon */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            <polygon points="6,4 20,12 6,20" fill="#1a9e7e" />
          </svg>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#1a9e7e",
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