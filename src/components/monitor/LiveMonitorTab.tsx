import { useEffect, useRef } from "react";
import { useDevice } from "@/context/DeviceContext";
import { MonitorControls } from "./MonitorControls";
import { PadGraph } from "./PadGraph";
import { PAD_NAMES } from "@/types";

export function LiveMonitorTab() {
  const { buffers, updateTrigger, config, maxBufferSize, isConnected, startStreaming } = useDevice();

  // Use ref to always have latest function without causing effect re-runs
  const startStreamingRef = useRef(startStreaming);
  useEffect(() => {
    startStreamingRef.current = startStreaming;
  });

  // Always start streaming when entering this tab (ignore previous pause state)
  useEffect(() => {
    if (isConnected) {
      startStreamingRef.current();
    }
  }, [isConnected]);

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
            updateTrigger={updateTrigger}
            lightThreshold={config.pads[pad].light}
            heavyThreshold={config.pads[pad].heavy}
            cutoffThreshold={config.pads[pad].cutoff}
            showHeavy={config.doubleInputMode}
            numPoints={maxBufferSize}
            displayPoints={500}
          />
        ))}
      </div>
    </div>
  );
}
