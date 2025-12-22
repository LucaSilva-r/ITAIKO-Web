import { useEffect, useRef } from "react";
import { useDevice } from "@/context/DeviceContext";
import { MonitorControls } from "./MonitorControls";
import { PadGraph } from "./PadGraph";
import { PAD_NAMES } from "@/types";

export function LiveMonitorTab() {
  const { buffers, config, maxBufferSize, isReady, startStreaming } = useDevice();

  // Use ref to always have latest function without causing effect re-runs
  const startStreamingRef = useRef(startStreaming);
  useEffect(() => {
    startStreamingRef.current = startStreaming;
  });

  // Start streaming when device is ready (after config read)
  useEffect(() => {
    if (isReady) {
      startStreamingRef.current();
    }
  }, [isReady]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <MonitorControls />

      {/* Graphs Grid */}
      <div className="flex flex-col gap-4">
        {PAD_NAMES.map((pad) => (
          <PadGraph
            key={pad}
            pad={pad}
            buffer={buffers.current[pad]}
            lightThreshold={config.pads[pad].light}
            heavyThreshold={config.pads[pad].heavy}
            cutoffThreshold={config.pads[pad].cutoff}
            showHeavy={config.doubleInputMode}
            numPoints={maxBufferSize}
            displayPoints={2000}
          />
        ))}
      </div>
    </div>
  );
}
