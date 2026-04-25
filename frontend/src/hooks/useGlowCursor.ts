import { useEffect, useRef } from "react";
import {
  CURSOR_INTERACTIVE_SELECTOR,
  SPARKLE_COUNT,
  SPARKLE_DISTANCE_RANGE,
  SPARKLE_DURATION_RANGE,
  SPARKLE_MIN_DISTANCE,
  SPARKLE_MIN_DURATION,
  SPARKLE_MIN_SIZE,
  SPARKLE_SIZE_RANGE,
} from "../constants";

function spawnSparkles(x: number, y: number) {
  for (let i = 0; i < SPARKLE_COUNT; i += 1) {
    const sparkle = document.createElement("div");
    sparkle.className = "cursor-sparkle";
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    const size = SPARKLE_MIN_SIZE + Math.random() * SPARKLE_SIZE_RANGE;
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;
    document.body.appendChild(sparkle);

    const angle = Math.random() * Math.PI * 2;
    const distance = SPARKLE_MIN_DISTANCE + Math.random() * SPARKLE_DISTANCE_RANGE;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const animation = sparkle.animate(
      [
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0)`,
          opacity: 0,
        },
      ],
      {
        duration: SPARKLE_MIN_DURATION + Math.random() * SPARKLE_DURATION_RANGE,
        easing: "ease-out",
      },
    );
    animation.onfinish = () => sparkle.remove();
  }
}

export function useGlowCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;
    let visible = false;
    let overInteractive = false;

    const onMove = (event: globalThis.MouseEvent) => {
      el.style.left = `${event.clientX}px`;
      el.style.top = `${event.clientY}px`;
      if (!visible) {
        el.style.opacity = "1";
        visible = true;
      }

      const target = event.target as HTMLElement | null;
      const interactive = !!target?.closest(CURSOR_INTERACTIVE_SELECTOR);

      if (interactive && !overInteractive) {
        el.classList.add("cursor-glow--hover");
        overInteractive = true;
        spawnSparkles(event.clientX, event.clientY);
      } else if (!interactive && overInteractive) {
        el.classList.remove("cursor-glow--hover");
        overInteractive = false;
      }
    };

    const onLeave = () => {
      el.style.opacity = "0";
      el.classList.remove("cursor-glow--hover");
      visible = false;
      overInteractive = false;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return cursorRef;
}
