import { createContext, useContext, useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import { useWebSerial } from "@/hooks/useWebSerial";
import { useDeviceConfig } from "@/hooks/useDeviceConfig";
import { useDeviceStreaming } from "@/hooks/useDeviceStreaming";
import type {
  ConnectionStatus,
  DeviceConfig,
  PadName,
  PadThresholds,
  TimingConfig,
  StreamFrame,
  PadBuffers,
} from "@/types";

interface DeviceContextValue {
  // Connection
  status: ConnectionStatus;
  error: string | null;
  isSupported: boolean;
  isConnected: boolean;
  requestPort: () => Promise<SerialPort | null>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;

  // Configuration
  config: DeviceConfig;
  configLoading: boolean;
  configDirty: boolean;
  readFromDevice: () => Promise<boolean>;
  writeToDevice: () => Promise<boolean>;
  saveToFlash: () => Promise<boolean>;
  resetToDefaults: () => void;
  updatePadThreshold: (pad: PadName, field: keyof PadThresholds, value: number) => void;
  updateTiming: (field: keyof TimingConfig, value: number) => void;
  setDoubleInputMode: (enabled: boolean) => void;

  // Streaming (zero-allocation buffer system)
  isStreaming: boolean;
  latestFrame: StreamFrame | null;
  buffers: RefObject<PadBuffers>;  // Direct access to Float32Array buffers
  updateTrigger: number;            // Increments to trigger re-renders
  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearData: () => void;
  maxBufferSize: number;
  setMaxBufferSize: (size: number) => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const serial = useWebSerial();

  const isConnected = serial.status === "connected";

  const deviceConfig = useDeviceConfig({
    sendCommand: serial.sendCommand,
    readUntilTimeout: serial.readUntilTimeout,
    isConnected,
  });

  const streaming = useDeviceStreaming({
    sendCommand: serial.sendCommand,
    startReading: serial.startReading,
    stopReading: serial.stopReading,
    isConnected,
  });

  const value = useMemo<DeviceContextValue>(
    () => ({
      // Connection
      status: serial.status,
      error: serial.error,
      isSupported: serial.isSupported,
      isConnected,
      requestPort: serial.requestPort,
      connect: serial.connect,
      disconnect: serial.disconnect,

      // Configuration
      config: deviceConfig.config,
      configLoading: deviceConfig.isLoading,
      configDirty: deviceConfig.isDirty,
      readFromDevice: deviceConfig.readFromDevice,
      writeToDevice: deviceConfig.writeToDevice,
      saveToFlash: deviceConfig.saveToFlash,
      resetToDefaults: deviceConfig.resetToDefaults,
      updatePadThreshold: deviceConfig.updatePadThreshold,
      updateTiming: deviceConfig.updateTiming,
      setDoubleInputMode: deviceConfig.setDoubleInputMode,

      // Streaming (zero-allocation buffer system)
      isStreaming: streaming.isStreaming,
      latestFrame: streaming.latestFrame,
      buffers: streaming.buffers,
      updateTrigger: streaming.updateTrigger,
      startStreaming: streaming.startStreaming,
      stopStreaming: streaming.stopStreaming,
      clearData: streaming.clearData,
      maxBufferSize: streaming.maxBufferSize,
      setMaxBufferSize: streaming.setMaxBufferSize,
    }),
    [serial, deviceConfig, streaming, isConnected]
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error("useDevice must be used within a DeviceProvider");
  }
  return context;
}
