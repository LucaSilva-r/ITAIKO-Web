import { useState, useCallback } from "react";
import type { DeviceConfig, PadName, PadThresholds, TimingConfig, DeviceCommand } from "@/types";
import { DeviceCommand as DeviceCommandValues } from "@/types";
import {
  parseSettingsResponse,
  settingsToConfig,
  configToSettingsString,
} from "@/lib/serial-protocol";
import { DEFAULT_DEVICE_CONFIG } from "@/lib/default-config";

interface UseDeviceConfigProps {
  sendCommand: (command: DeviceCommand, data?: string) => Promise<void>;
  readUntilTimeout: (timeoutMs?: number) => Promise<string>;
  isConnected: boolean;
}

interface UseDeviceConfigReturn {
  config: DeviceConfig;
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  readFromDevice: () => Promise<boolean>;
  writeToDevice: () => Promise<boolean>;
  saveToFlash: () => Promise<boolean>;
  resetToDefaults: () => void;

  // Update helpers
  updatePadThreshold: (
    pad: PadName,
    field: keyof PadThresholds,
    value: number
  ) => void;
  updateTiming: (field: keyof TimingConfig, value: number) => void;
  setDoubleInputMode: (enabled: boolean) => void;
}

export function useDeviceConfig({
  sendCommand,
  readUntilTimeout,
  isConnected,
}: UseDeviceConfigProps): UseDeviceConfigReturn {
  const [config, setConfig] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);
  const [savedConfig, setSavedConfig] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const readFromDevice = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;

    setIsLoading(true);
    try {
      await sendCommand(DeviceCommandValues.READ_SETTINGS);
      const response = await readUntilTimeout(1000);
      const { settings, version } = parseSettingsResponse(response);

      if (settings.size > 0) {
        const newConfig = settingsToConfig(settings, version);
        setConfig(newConfig);
        setSavedConfig(newConfig);
        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to read config:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, sendCommand, readUntilTimeout]);

  const writeToDevice = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;

    setIsLoading(true);
    try {
      const settingsString = configToSettingsString(config);
      await sendCommand(DeviceCommandValues.WRITE_MODE, settingsString);
      setSavedConfig(config);
      return true;
    } catch (err) {
      console.error("Failed to write config:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, sendCommand, config]);

  const saveToFlash = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;

    setIsLoading(true);
    try {
      // First write current config
      const writeSuccess = await writeToDevice();
      if (!writeSuccess) return false;

      // Then save to flash
      await sendCommand(DeviceCommandValues.SAVE_TO_FLASH);
      return true;
    } catch (err) {
      console.error("Failed to save to flash:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, sendCommand, writeToDevice]);

  const resetToDefaults = useCallback((): void => {
    setConfig(DEFAULT_DEVICE_CONFIG);
  }, []);

  const updatePadThreshold = useCallback(
    (pad: PadName, field: keyof PadThresholds, value: number): void => {
      setConfig((prev) => ({
        ...prev,
        pads: {
          ...prev.pads,
          [pad]: {
            ...prev.pads[pad],
            [field]: value,
          },
        },
      }));
    },
    []
  );

  const updateTiming = useCallback(
    (field: keyof TimingConfig, value: number): void => {
      setConfig((prev) => ({
        ...prev,
        timing: {
          ...prev.timing,
          [field]: value,
        },
      }));
    },
    []
  );

  const setDoubleInputMode = useCallback((enabled: boolean): void => {
    setConfig((prev) => ({
      ...prev,
      doubleInputMode: enabled,
    }));
  }, []);

  return {
    config,
    isLoading,
    isDirty,
    readFromDevice,
    writeToDevice,
    saveToFlash,
    resetToDefaults,
    updatePadThreshold,
    updateTiming,
    setDoubleInputMode,
  };
}
