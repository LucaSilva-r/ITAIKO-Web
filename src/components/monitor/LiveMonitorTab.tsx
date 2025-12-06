import { useDevice } from "@/context/DeviceContext";
import { MonitorControls } from "./MonitorControls";
import { PadGraph } from "./PadGraph";
import { PAD_NAMES } from "@/types";

export function LiveMonitorTab() {
  const { graphData, config, maxBufferSize } = useDevice();

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
            data={graphData[pad]}
            lightThreshold={config.pads[pad].light}
            heavyThreshold={config.pads[pad].heavy}
            cutoffThreshold={config.pads[pad].cutoff}
            showHeavy={config.doubleInputMode}
            numPoints={maxBufferSize}
          />
        ))}
      </div>
    </div>
  );
}
