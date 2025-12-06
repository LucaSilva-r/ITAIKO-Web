import { useState, useCallback, useRef, useEffect } from "react";
import type { DeviceCommand, PadName, StreamFrame, PadBuffer, PadBuffers } from "@/types";
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

  // Zero-allocation buffer access
  buffers: React.RefObject<PadBuffers>;
  updateTrigger: number; // Increments to trigger re-renders

  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearData: () => void;

  // Buffer settings
  maxBufferSize: number;
  setMaxBufferSize: (size: number) => void;
}

// Create a single PadBuffer with pre-allocated Float32Arrays
function createPadBuffer(capacity: number): PadBuffer {
  return {
    raw: new Float32Array(capacity),
    delta: new Float32Array(capacity),
    head: 0,
    count: 0,
    capacity,
  };
}

// Create buffers for all pads
function createPadBuffers(capacity: number): PadBuffers {
  return {
    kaLeft: createPadBuffer(capacity),
    donLeft: createPadBuffer(capacity),
    donRight: createPadBuffer(capacity),
    kaRight: createPadBuffer(capacity),
  };
}

// Resize a buffer while preserving recent data
function resizePadBuffer(buffer: PadBuffer, newCapacity: number): PadBuffer {
  const newBuffer = createPadBuffer(newCapacity);

  // Copy data from old buffer to new (most recent data)
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

export function useDeviceStreaming({
  sendCommand,
  startReading,
  stopReading,
  isConnected,
}: UseDeviceStreamingProps): UseDeviceStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestFrame, setLatestFrame] = useState<StreamFrame | null>(null);
  const [maxBufferSize, setMaxBufferSizeState] = useState(DEFAULT_BUFFER_SIZE);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Pre-allocated buffers - these are mutated in place, never recreated during streaming
  const buffersRef = useRef<PadBuffers>(createPadBuffers(DEFAULT_BUFFER_SIZE));

  // Track previous raw values for delta calculation
  const previousRawRef = useRef<Record<PadName, number>>({
    kaLeft: 0,
    donLeft: 0,
    donRight: 0,
    kaRight: 0,
  });

  // Throttling refs
  const lastRenderUpdateRef = useRef(0);
  const lastFrameUpdateRef = useRef(0);
  const RENDER_THROTTLE_MS = 16;  // ~60fps for graph updates
  const FRAME_THROTTLE_MS = 33;   // ~30fps for latestFrame state

  // Resize buffers when maxBufferSize changes
  const setMaxBufferSize = useCallback((size: number) => {
    setMaxBufferSizeState(size);

    const buffers = buffersRef.current;
    PAD_NAMES.forEach((pad) => {
      buffersRef.current[pad] = resizePadBuffer(buffers[pad], size);
    });

    // Trigger a re-render after resize
    setUpdateTrigger((t) => t + 1);
  }, []);

  // Zero-allocation data handler
  const handleStreamData = useCallback((line: string) => {
    const frame = parseStreamLine(line);
    if (!frame) return;

    const now = performance.now();
    const buffers = buffersRef.current;

    // Write directly to Float32Arrays - NO object allocation
    PAD_NAMES.forEach((pad) => {
      const padData = frame.pads[pad];
      const buffer = buffers[pad];
      const previousRaw = previousRawRef.current[pad];
      const delta = Math.max(0, padData.raw - previousRaw);

      // Write to circular buffer at head position
      buffer.raw[buffer.head] = padData.raw;
      buffer.delta[buffer.head] = delta;

      // Advance head (circular)
      buffer.head = (buffer.head + 1) % buffer.capacity;

      // Increase count until we hit capacity
      if (buffer.count < buffer.capacity) {
        buffer.count++;
      }

      previousRawRef.current[pad] = padData.raw;
    });

    // Throttled render update (~60fps)
    if (now - lastRenderUpdateRef.current >= RENDER_THROTTLE_MS) {
      lastRenderUpdateRef.current = now;
      setUpdateTrigger((t) => t + 1);
    }

    // Throttled latestFrame update (~30fps) - this is for the numeric display only
    if (now - lastFrameUpdateRef.current >= FRAME_THROTTLE_MS) {
      lastFrameUpdateRef.current = now;
      // Add delta values to the frame
      const frameWithDelta: StreamFrame = {
        ...frame,
        pads: {
          kaLeft: { ...frame.pads.kaLeft, delta: buffers.kaLeft.delta[(buffers.kaLeft.head - 1 + buffers.kaLeft.capacity) % buffers.kaLeft.capacity] },
          donLeft: { ...frame.pads.donLeft, delta: buffers.donLeft.delta[(buffers.donLeft.head - 1 + buffers.donLeft.capacity) % buffers.donLeft.capacity] },
          donRight: { ...frame.pads.donRight, delta: buffers.donRight.delta[(buffers.donRight.head - 1 + buffers.donRight.capacity) % buffers.donRight.capacity] },
          kaRight: { ...frame.pads.kaRight, delta: buffers.kaRight.delta[(buffers.kaRight.head - 1 + buffers.kaRight.capacity) % buffers.kaRight.capacity] },
        },
      };
      setLatestFrame(frameWithDelta);
    }
  }, []);

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
    // Reset buffers in place - no allocation
    PAD_NAMES.forEach((pad) => {
      const buffer = buffersRef.current[pad];
      buffer.head = 0;
      buffer.count = 0;
      // Note: We don't need to zero the Float32Arrays, just reset head/count
    });

    setLatestFrame(null);
    previousRawRef.current = {
      kaLeft: 0,
      donLeft: 0,
      donRight: 0,
      kaRight: 0,
    };
    lastRenderUpdateRef.current = 0;
    lastFrameUpdateRef.current = 0;
    setUpdateTrigger((t) => t + 1);
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
    buffers: buffersRef,
    updateTrigger,
    startStreaming: startStreamingFn,
    stopStreaming: stopStreamingFn,
    clearData,
    maxBufferSize,
    setMaxBufferSize,
  };
}
