import { createContext, useContext, useMemo, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useWebSerial } from "@/hooks/useWebSerial";
import { useDeviceConfig } from "@/hooks/useDeviceConfig";
import { useDeviceStreaming, type TriggerState } from "@/hooks/useDeviceStreaming";
import { useFirmwareUpdate, type GithubRelease, type UpdateStatus } from "@/hooks/useFirmwareUpdate";
import {
  DeviceCommand,
  type ConnectionStatus,
  type DeviceConfig,
  type PadName,
  type PadThresholds,
  type TimingConfig,
  type PadBuffers,
  type KeyMappings,
  type ADCChannels,
} from "@/types";

interface DeviceContextValue {
  // Connection
  status: ConnectionStatus;
  error: string | null;
  isSupported: boolean;
  isConnected: boolean;
  isReady: boolean;  // True after initial config read completes
  hasAuthorizedDevice: boolean;
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
  updateKeyMapping: (category: keyof KeyMappings, key: string, value: number) => void;
  updateADCChannel: (pad: keyof ADCChannels, channel: number) => void;
  rebootToBootsel: () => Promise<void>;

  // Streaming
  isStreaming: boolean;
  triggers: TriggerState;
  buffers: RefObject<PadBuffers>;
  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearData: () => void;
  maxBufferSize: number;
  setMaxBufferSize: (size: number) => void;

  // Firmware Update
  firmwareUpdate: {
    status: UpdateStatus;
    latestRelease: GithubRelease | null;
    error: string | null;
    progress: number;
    checkUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    modalOpen: boolean;
    setModalOpen: (open: boolean) => void;
  };
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const serial = useWebSerial();
  const [isReady, setIsReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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

  const firmwareUpdate = useFirmwareUpdate(deviceConfig.config.firmwareVersion);

  // Track previous connection state to detect new connections
  const wasConnectedRef = useRef(false);

  // Auto-read config when device connects
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      // New connection - read config first
      setIsReady(false);
      deviceConfig.readFromDevice().then(() => {
        setIsReady(true);
      });
    } else if (!isConnected) {
      // Disconnected
      setIsReady(false);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, deviceConfig.readFromDevice]);

  const rebootToBootsel = async () => {
    if (isConnected) {
      try {
        await serial.sendCommand(DeviceCommand.REBOOT_TO_BOOTSEL);
        // Give the command a moment to be sent
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Force disconnect since the device is rebooting and will disappear
        await serial.disconnect();
      } catch (err) {
        console.error("Failed to reboot device:", err);
      }
    }
  };
  
  const handleInstallUpdate = async () => {
    await firmwareUpdate.installUpdate(rebootToBootsel);
    
    // Auto-reconnect logic
    console.log("Update process finished. Waiting for device reboot...");
    
    // Poll for the device for up to 20 seconds
    const pollInterval = 1000;
    const maxAttempts = 20;
    let attempts = 0;

    const pollForDevice = async () => {
      attempts++;
      console.log(`Searching for device (Attempt ${attempts}/${maxAttempts})...`);
      
      const port = await serial.findAuthorizedPort();
      if (port) {
        console.log("Device found! Connecting...");
        await serial.connect();
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(pollForDevice, pollInterval);
      } else {
        console.log("Device not found after reboot.");
      }
    };

    // Start polling after a short delay to allow reboot to start
    setTimeout(pollForDevice, 2000);
  };

  const value = useMemo<DeviceContextValue>(
    () => ({
      // Connection
      status: serial.status,
      error: serial.error,
      isSupported: serial.isSupported,
      isConnected,
      isReady,
      hasAuthorizedDevice: serial.hasAuthorizedDevice,
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
      updateKeyMapping: deviceConfig.updateKeyMapping,
      updateADCChannel: deviceConfig.updateADCChannel,
      rebootToBootsel,

      // Streaming
      isStreaming: streaming.isStreaming,
      triggers: streaming.triggers,
      buffers: streaming.buffers,
      startStreaming: streaming.startStreaming,
      stopStreaming: streaming.stopStreaming,
      clearData: streaming.clearData,
      maxBufferSize: streaming.maxBufferSize,
      setMaxBufferSize: streaming.setMaxBufferSize,

      // Firmware Update
      firmwareUpdate: {
        status: firmwareUpdate.status,
        latestRelease: firmwareUpdate.latestRelease,
        error: firmwareUpdate.error,
        progress: firmwareUpdate.progress,
        checkUpdate: firmwareUpdate.checkUpdate,
        installUpdate: handleInstallUpdate,
        modalOpen,
        setModalOpen,
      },
    }),
    [serial, deviceConfig, streaming, isConnected, isReady, firmwareUpdate, modalOpen]
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
