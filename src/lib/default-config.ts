import type { DeviceConfig, MonitorSettings } from "@/types";

export const DEFAULT_DEVICE_CONFIG: DeviceConfig = {
  pads: {
    kaLeft: { light: 800, heavy: 1200, cutoff: 4095 },
    donLeft: { light: 800, heavy: 1200, cutoff: 4095 },
    donRight: { light: 800, heavy: 1200, cutoff: 4095 },
    kaRight: { light: 800, heavy: 1200, cutoff: 4095 },
  },
  doubleInputMode: false,
  timing: {
    donDebounce: 30,
    kaDebounce: 30,
    crosstalkDebounce: 30,
    individualDebounce: 19,
    keyHoldTime: 25,
  },
};

export const DEFAULT_MONITOR_SETTINGS: MonitorSettings = {
  refreshRate: 50, // 50ms = 20Hz update rate for graphs
  historyBuffer: 1000, // 1000 samples visible
  csvLogging: false,
};

// Threshold limits
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 4095;

// Timing limits (ms)
export const TIMING_MIN = 0;
export const TIMING_MAX = 1000;

// Monitor settings limits
export const REFRESH_RATE_MIN = 10;
export const REFRESH_RATE_MAX = 1000;
export const HISTORY_BUFFER_MIN = 100;
export const HISTORY_BUFFER_MAX = 10000;
