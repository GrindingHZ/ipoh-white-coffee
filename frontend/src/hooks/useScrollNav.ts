import { useEffect, useRef, useState } from "react";

interface UseScrollNavResult {
  navHidden: boolean;
  navHovered: boolean;
  setNavHovered: (v: boolean) => void;
  appScreenRef: React.RefObject<HTMLElement | null>;
}

export function useScrollNav(): UseScrollNavResult {
  const [navHidden, setNavHidden] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const lastScrollY = useRef(0);
  const appScreenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const threshold = appScreenRef.current?.offsetTop ?? 80;
      if (y > lastScrollY.current && y > threshold) {
        setNavHidden(true);
      } else if (y < lastScrollY.current) {
        setNavHidden(false);
      }
      lastScrollY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { navHidden, navHovered, setNavHovered, appScreenRef };
}
