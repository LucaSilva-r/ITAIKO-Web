import { useState, useCallback, useRef, useEffect } from "react";
import type { DeviceCommand, PadName, PadBuffer, PadBuffers } from "@/types";
import { DeviceCommand as DeviceCommandValues, PAD_NAMES } from "@/types";
import { parseStreamLine } from "@/lib/serial-protocol";

interface UseDeviceStreamingProps {
  sendCommand: (command: DeviceCommand) => Promise<void>;
  startReading: (onData: (line: string) => void) => void;
  stopReading: () => void;
  isConnected: boolean;
}

// Simple trigger state - just 4 booleans
export type TriggerState = Record<PadName, boolean>;

interface UseDeviceStreamingReturn {
  isStreaming: boolean;
  triggers: TriggerState;  // Simple: just which pads are active

  // Zero-allocation buffer access for graphs
  buffers: React.RefObject<PadBuffers>;

  startStreaming: (force?: boolean) => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearData: () => void;

  maxBufferSize: number;
  setMaxBufferSize: (size: number) => void;
}

function createPadBuffer(capacity: number): PadBuffer {
  return {
    raw: new Float32Array(capacity),
    delta: new Float32Array(capacity),
    head: 0,
    count: 0,
    capacity,
  };
}

function createPadBuffers(capacity: number): PadBuffers {
  return {
    kaLeft: createPadBuffer(capacity),
    donLeft: createPadBuffer(capacity),
    donRight: createPadBuffer(capacity),
    kaRight: createPadBuffer(capacity),
  };
}

function resizePadBuffer(buffer: PadBuffer, newCapacity: number): PadBuffer {
  const newBuffer = createPadBuffer(newCapacity);
  const copyCount = Math.min(buffer.count, newCapacity);
  const startRead = (buffer.head - buffer.count + buffer.capacity) % buffer.capacity;

  for (let i = 0; i < copyCount; i++) {
    const readIdx = (startRead + buffer.count - copyCount + i) % buffer.capacity;
    newBuffer.raw[i] = buffer.raw[readIdx];
    newBuffer.delta[i] = buffer.delta[readIdx];
  }

  newBuffer.head = copyCount % newCapacity;
  newBuffer.count = copyCount;
  return newBuffer;
}

const DEFAULT_BUFFER_SIZE = 1000;
const INITIAL_TRIGGERS: TriggerState = { kaLeft: false, donLeft: false, donRight: false, kaRight: false };

export function useDeviceStreaming({
  sendCommand,
  startReading,
  stopReading,
  isConnected,
}: UseDeviceStreamingProps): UseDeviceStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [triggers, setTriggers] = useState<TriggerState>(INITIAL_TRIGGERS);
  const [maxBufferSize, setMaxBufferSizeState] = useState(DEFAULT_BUFFER_SIZE);

  const buffersRef = useRef<PadBuffers>(createPadBuffers(DEFAULT_BUFFER_SIZE));
  const previousRawRef = useRef<Record<PadName, number>>({ kaLeft: 0, donLeft: 0, donRight: 0, kaRight: 0 });

  // Accumulate triggers between UI frames
  const accumulatedTriggersRef = useRef<TriggerState>({ kaLeft: false, donLeft: false, donRight: false, kaRight: false });

  // Throttling
  const lastFrameUpdateRef = useRef(0);
  const FRAME_THROTTLE_MS = 16; // ~60fps

  const setMaxBufferSize = useCallback((size: number) => {
    setMaxBufferSizeState(size);
    PAD_NAMES.forEach((pad) => {
      buffersRef.current[pad] = resizePadBuffer(buffersRef.current[pad], size);
    });
  }, []);

  const handleStreamData = useCallback((line: string) => {
    const frame = parseStreamLine(line);
    if (!frame) return;

    const now = performance.now();
    const buffers = buffersRef.current;
    const accumulated = accumulatedTriggersRef.current;

    // Process each pad - write to buffer and accumulate triggers
    for (let i = 0; i < 4; i++) {
      const pad = PAD_NAMES[i];
      const padData = frame.pads[pad];

      // Latch trigger
      if (padData.triggered) {
        accumulated[pad] = true;
      }

      // Write to circular buffer
      const buffer = buffers[pad];
      const previousRaw = previousRawRef.current[pad];
      const delta = Math.max(0, padData.raw - previousRaw);

      buffer.raw[buffer.head] = padData.raw;
      buffer.delta[buffer.head] = delta;
      buffer.head = (buffer.head + 1) % buffer.capacity;
      if (buffer.count < buffer.capacity) buffer.count++;

      previousRawRef.current[pad] = padData.raw;
    }

    // Throttled UI update - only update if triggers changed
    if (now - lastFrameUpdateRef.current >= FRAME_THROTTLE_MS) {
      lastFrameUpdateRef.current = now;

      // Only call setTriggers if something actually triggered
      const { kaLeft, donLeft, donRight, kaRight } = accumulated;

      setTriggers(prev => {
        // Skip update if nothing changed
        if (prev.kaLeft === kaLeft && prev.donLeft === donLeft &&
            prev.donRight === donRight && prev.kaRight === kaRight) {
          return prev;
        }
        return { kaLeft, donLeft, donRight, kaRight };
      });

      // Reset accumulators
      accumulated.kaLeft = false;
      accumulated.donLeft = false;
      accumulated.donRight = false;
      accumulated.kaRight = false;
    }
  }, []);

  const startStreamingFn = useCallback(async (force?: boolean): Promise<void> => {
    if (!isConnected || (isStreaming && !force)) return;
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
    PAD_NAMES.forEach((pad) => {
      buffersRef.current[pad].head = 0;
      buffersRef.current[pad].count = 0;
      accumulatedTriggersRef.current[pad] = false;
    });
    setTriggers(INITIAL_TRIGGERS);
    previousRawRef.current = { kaLeft: 0, donLeft: 0, donRight: 0, kaRight: 0 };
    lastFrameUpdateRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isConnected && isStreaming) {
      setIsStreaming(false);
    }
  }, [isConnected, isStreaming]);

  return {
    isStreaming,
    triggers,
    buffers: buffersRef,
    startStreaming: startStreamingFn,
    stopStreaming: stopStreamingFn,
    clearData,
    maxBufferSize,
    setMaxBufferSize,
  };
}
