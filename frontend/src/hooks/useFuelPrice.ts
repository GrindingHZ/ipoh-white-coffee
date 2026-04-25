import { useEffect, useState } from "react";
import { INITIAL_DIESEL_CONDITION, INITIAL_RON95_CONDITION } from "../constants";
import { getFuelPrice } from "../services/api";
import type { AmbientCondition } from "../types";

export function useFuelPrice(locality?: string) {
  const [diesel, setDiesel] = useState<AmbientCondition>(INITIAL_DIESEL_CONDITION);
  const [ron95, setRon95] = useState<AmbientCondition>(INITIAL_RON95_CONDITION);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fuel = await getFuelPrice(locality);
        if (cancelled) return;
        setDiesel({
          icon: "⛽",
          label: "Diesel",
          value: `RM${fuel.dieselPrice.toFixed(2)} Diesel`,
          sub: `Updated ${fuel.effectiveDate}`,
        });
        setRon95({
          icon: "⛽",
          label: "RON95",
          value: `RM${fuel.ron95Price.toFixed(2)} RON95`,
          sub: `Updated ${fuel.effectiveDate}`,
        });
      } catch {
        if (cancelled) return;
        setDiesel({
          icon: "⛽",
          label: "Diesel",
          value: "Diesel unavailable",
          sub: "Check again later",
        });
        setRon95({
          icon: "⛽",
          label: "RON95",
          value: "RON95 unavailable",
          sub: "Check again later",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locality]);

  return { diesel, ron95 };
}
