import { useState, useEffect, useMemo } from "react";
import type { DeviceConfig, TriggerState } from "@/types";
import { browserKeyToHid } from "@/lib/hid-keycodes";

const INITIAL_TRIGGERS: TriggerState = { kaLeft: false, donLeft: false, donRight: false, kaRight: false };

export function useKeyboardInput(config: DeviceConfig) {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const hid = browserKeyToHid(event);
      if (hid !== null) {
        setActiveKeys(prev => {
          const next = new Set(prev);
          next.add(hid);
          return next;
        });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const hid = browserKeyToHid(event);
      if (hid !== null) {
        setActiveKeys(prev => {
          const next = new Set(prev);
          next.delete(hid);
          return next;
        });
      }
    };

    // We listen on window to catch all inputs
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const triggers = useMemo<TriggerState>(() => {
    // If no config or key mappings, return empty triggers
    if (!config.keyMappings) return INITIAL_TRIGGERS;

    const km = config.keyMappings;
    const isPressed = (hid: number) => activeKeys.has(hid);
    
    return {
      kaLeft: isPressed(km.drumP1.kaLeft) || isPressed(km.drumP2.kaLeft),
      donLeft: isPressed(km.drumP1.donLeft) || isPressed(km.drumP2.donLeft),
      donRight: isPressed(km.drumP1.donRight) || isPressed(km.drumP2.donRight),
      kaRight: isPressed(km.drumP1.kaRight) || isPressed(km.drumP2.kaRight),
    };
  }, [activeKeys, config]);

  return triggers;
}
