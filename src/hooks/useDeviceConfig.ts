import { useState, useCallback, useEffect } from "react";
import type { DeviceConfig, PadName, PadThresholds, TimingConfig, DeviceCommand, KeyMappings, ADCChannels } from "@/types";
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

  // History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Actions
  readFromDevice: () => Promise<boolean>;
  writeToDevice: () => Promise<boolean>;
  saveToFlash: () => Promise<boolean>;
  resetToDefaults: () => void;

  // Section-specific resets
  resetPadThresholds: () => void;
  resetTiming: () => void;
  resetKeyMappings: () => void;
  resetADCChannels: () => void;

  // Import/Export
  exportConfig: () => void;
  importConfig: (file: File) => Promise<boolean>;

  // Update helpers
  updatePadThreshold: (
    pad: PadName,
    field: keyof PadThresholds,
    value: number,
    commit?: boolean
  ) => void;
  updateTiming: (field: keyof TimingConfig, value: number, commit?: boolean) => void;
  setDoubleInputMode: (enabled: boolean, commit?: boolean) => void;
  updateKeyMapping: (
    category: keyof KeyMappings,
    key: string,
    value: number,
    commit?: boolean
  ) => void;
  updateADCChannel: (
    pad: keyof ADCChannels,
    channel: number,
    commit?: boolean
  ) => void;
}

export function useDeviceConfig({
  sendCommand,
  readUntilTimeout,
  isConnected,
}: UseDeviceConfigProps): UseDeviceConfigReturn {
  const [config, setConfig] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);
  const [savedConfig, setSavedConfig] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  // History State
  const [history, setHistory] = useState<DeviceConfig[]>([]);
  const [future, setFuture] = useState<DeviceConfig[]>([]);
  const [lastCommittedConfig, setLastCommittedConfig] = useState<DeviceConfig>(DEFAULT_DEVICE_CONFIG);

  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture((prev) => [config, ...prev]);
    setHistory(newHistory);
    setConfig(previous);
    setLastCommittedConfig(previous);
  }, [history, config]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory((prev) => [...prev, config]);
    setFuture(newFuture);
    setConfig(next);
    setLastCommittedConfig(next);
  }, [future, config]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl (or Cmd on Mac)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
           e.preventDefault();
           if (e.shiftKey) {
             redo();
           } else {
             undo();
           }
        } else if (e.key === 'y') {
           e.preventDefault();
           redo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Internal helper to handle history commit inside update functions
  const handleCommit = (newConfig: DeviceConfig) => {
    setHistory(h => {
        const newH = [...h, lastCommittedConfig];
        return newH.length > 50 ? newH.slice(newH.length - 50) : newH;
    });
    setFuture([]);
    setLastCommittedConfig(newConfig);
  };

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
        
        // Reset history
        setLastCommittedConfig(newConfig);
        setHistory([]);
        setFuture([]);
        
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
    setConfig((prev) => {
        const next = DEFAULT_DEVICE_CONFIG;
        handleCommit(next);
        return next;
    });
  }, [lastCommittedConfig]);

  const resetPadThresholds = useCallback((): void => {
    setConfig((prev) => {
      const next = {
        ...prev,
        pads: DEFAULT_DEVICE_CONFIG.pads,
      };
      handleCommit(next);
      return next;
    });
  }, [lastCommittedConfig]);

  const resetTiming = useCallback((): void => {
    setConfig((prev) => {
      const next = {
        ...prev,
        timing: DEFAULT_DEVICE_CONFIG.timing,
      };
      handleCommit(next);
      return next;
    });
  }, [lastCommittedConfig]);

  const resetKeyMappings = useCallback((): void => {
    setConfig((prev) => {
        const next = {
          ...prev,
          keyMappings: DEFAULT_DEVICE_CONFIG.keyMappings,
        };
        handleCommit(next);
        return next;
    });
  }, [lastCommittedConfig]);

  const resetADCChannels = useCallback((): void => {
    setConfig((prev) => {
        const next = {
          ...prev,
          adcChannels: DEFAULT_DEVICE_CONFIG.adcChannels,
        };
        handleCommit(next);
        return next;
    });
  }, [lastCommittedConfig]);

  const exportConfig = useCallback((): void => {
    // Create a clean config object without firmwareVersion (device-specific)
    const exportData = {
      pads: config.pads,
      doubleInputMode: config.doubleInputMode,
      timing: config.timing,
      keyMappings: config.keyMappings,
      adcChannels: config.adcChannels,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itaiko-config-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [config]);

  const importConfig = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      // Validate the imported config has required fields
      if (!imported.pads || !imported.timing) {
        console.error("Invalid config file: missing required fields");
        return false;
      }

      // Merge with current config, preserving firmwareVersion
      setConfig((prev) => {
          const next = {
            ...prev,
            pads: imported.pads ?? prev.pads,
            doubleInputMode: imported.doubleInputMode ?? prev.doubleInputMode,
            timing: imported.timing ?? prev.timing,
            keyMappings: imported.keyMappings ?? prev.keyMappings,
            adcChannels: imported.adcChannels ?? prev.adcChannels,
          };
          handleCommit(next);
          return next;
      });

      return true;
    } catch (err) {
      console.error("Failed to import config:", err);
      return false;
    }
  }, [lastCommittedConfig]);

  const updatePadThreshold = useCallback(
    (pad: PadName, field: keyof PadThresholds, value: number, commit = true): void => {
      setConfig((prev) => {
        const next = {
          ...prev,
          pads: {
            ...prev.pads,
            [pad]: {
              ...prev.pads[pad],
              [field]: value,
            },
          },
        };
        if (commit) {
            handleCommit(next);
        }
        return next;
      });
    },
    [lastCommittedConfig]
  );

  const updateTiming = useCallback(
    (field: keyof TimingConfig, value: number, commit = true): void => {
      setConfig((prev) => {
        const next = {
          ...prev,
          timing: {
            ...prev.timing,
            [field]: value,
          },
        };
        if (commit) {
            handleCommit(next);
        }
        return next;
      });
    },
    [lastCommittedConfig]
  );

  const setDoubleInputMode = useCallback((enabled: boolean, commit = true): void => {
    setConfig((prev) => {
      const next = {
        ...prev,
        doubleInputMode: enabled,
      };
      if (commit) {
          handleCommit(next);
      }
      return next;
    });
  }, [lastCommittedConfig]);

  const updateKeyMapping = useCallback(
    (category: keyof KeyMappings, key: string, value: number, commit = true): void => {
      setConfig((prev) => {
        if (!prev.keyMappings) return prev;

        const next = {
          ...prev,
          keyMappings: {
            ...prev.keyMappings,
            [category]: {
              ...prev.keyMappings[category],
              [key]: value,
            },
          },
        };
        if (commit) {
            handleCommit(next);
        }
        return next;
      });
    },
    [lastCommittedConfig]
  );

  const updateADCChannel = useCallback(
    (pad: keyof ADCChannels, channel: number, commit = true): void => {
      setConfig((prev) => {
        if (!prev.adcChannels) return prev;

        const next = {
          ...prev,
          adcChannels: {
            ...prev.adcChannels,
            [pad]: channel,
          },
        };
        if (commit) {
            handleCommit(next);
        }
        return next;
      });
    },
    [lastCommittedConfig]
  );

  return {
    config,
    isLoading,
    isDirty,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    readFromDevice,
    writeToDevice,
    saveToFlash,
    resetToDefaults,
    resetPadThresholds,
    resetTiming,
    resetKeyMappings,
    resetADCChannels,
    exportConfig,
    importConfig,
    updatePadThreshold,
    updateTiming,
    setDoubleInputMode,
    updateKeyMapping,
    updateADCChannel,
  };
}