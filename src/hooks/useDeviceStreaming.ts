import { useState, useCallback, useRef, useEffect } from "react";
import type { DeviceCommand, PadName, PadGraphPoint, StreamFrame } from "@/types";
import { DeviceCommand as DeviceCommandValues, PAD_NAMES } from "@/types";
import { parseStreamLine } from "@/lib/serial-protocol";

interface UseDeviceStreamingProps {
  sendCommand: (command: DeviceCommand) => Promise<void>;
  startReading: (onData: (line: string) => void) => void;
  stopReading: () => void;
  isConnected: boolean;
}

interface UseDeviceStreamingReturn {
  isStreaming: boolean;
  latestFrame: StreamFrame | null;
  graphData: Record<PadName, PadGraphPoint[]>;

  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearData: () => void;

  // Buffer settings
  maxBufferSize: number;
  setMaxBufferSize: (size: number) => void;
}

function createEmptyGraphData(): Record<PadName, PadGraphPoint[]> {
  return {
    kaLeft: [],
    donLeft: [],
    donRight: [],
    kaRight: [],
  };
}

export function useDeviceStreaming({
  sendCommand,
  startReading,
  stopReading,
  isConnected,
}: UseDeviceStreamingProps): UseDeviceStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestFrame, setLatestFrame] = useState<StreamFrame | null>(null);
  const [graphData, setGraphData] = useState<Record<PadName, PadGraphPoint[]>>(
    createEmptyGraphData
  );
  const [maxBufferSize, setMaxBufferSize] = useState(1000);

  const previousRawRef = useRef<Record<PadName, number>>({
    kaLeft: 0,
    donLeft: 0,
    donRight: 0,
    kaRight: 0,
  });

  const timeRef = useRef(0);

  const handleStreamData = useCallback(
    (line: string) => {
      const frame = parseStreamLine(line);
      if (!frame) return;

      setLatestFrame(frame);
      timeRef.current += 1;

      setGraphData((prev) => {
        const newData = { ...prev };

        PAD_NAMES.forEach((pad) => {
          const padData = frame.pads[pad];
          const previousRaw = previousRawRef.current[pad];
          const delta = Math.max(0, padData.raw - previousRaw);

          const point: PadGraphPoint = {
            time: timeRef.current,
            raw: padData.raw,
            delta,
            duration: padData.duration,
          };

          previousRawRef.current[pad] = padData.raw;

          // Add new point and trim to max buffer size
          const padArray = [...prev[pad], point];
          if (padArray.length > maxBufferSize) {
            newData[pad] = padArray.slice(-maxBufferSize);
          } else {
            newData[pad] = padArray;
          }
        });

        return newData;
      });
    },
    [maxBufferSize]
  );

  const startStreamingFn = useCallback(async (): Promise<void> => {
    if (!isConnected || isStreaming) return;

    try {
      await sendCommand(DeviceCommandValues.START_STREAMING);
      setIsStreaming(true);
      startReading(handleStreamData);
    } catch (err) {
      console.error("Failed to start streaming:", err);
    }
  }, [isConnected, isStreaming, sendCommand, startReading, handleStreamData]);

  const stopStreamingFn = useCallback(async (): Promise<void> => {
    if (!isStreaming) return;

    try {
      stopReading();
      await sendCommand(DeviceCommandValues.STOP_STREAMING);
    } catch (err) {
      console.error("Failed to stop streaming:", err);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, sendCommand, stopReading]);

  const clearData = useCallback((): void => {
    setGraphData(createEmptyGraphData());
    setLatestFrame(null);
    timeRef.current = 0;
    previousRawRef.current = {
      kaLeft: 0,
      donLeft: 0,
      donRight: 0,
      kaRight: 0,
    };
  }, []);

  // Stop streaming when disconnected
  useEffect(() => {
    if (!isConnected && isStreaming) {
      setIsStreaming(false);
    }
  }, [isConnected, isStreaming]);

  return {
    isStreaming,
    latestFrame,
    graphData,
    startStreaming: startStreamingFn,
    stopStreaming: stopStreamingFn,
    clearData,
    maxBufferSize,
    setMaxBufferSize,
  };
}
