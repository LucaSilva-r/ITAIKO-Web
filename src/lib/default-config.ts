import type { DeviceConfig, MonitorSettings } from "@/types";

// HID Keyboard keycodes (USB HID Usage Tables)
// Common defaults for Taiko controllers
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
  keyMappings: {
    drumP1: {
      kaLeft: 0x08,   // E
      donLeft: 0x07,  // D
      donRight: 0x09, // F
      kaRight: 0x0C,  // I
    },
    drumP2: {
      kaLeft: 0x52,   // Up Arrow
      donLeft: 0x50,  // Left Arrow
      donRight: 0x4F,  // Right Arrow
      kaRight: 0x51,  // Down Arrow
    },
    controller: {
      up: 0x52,       // Up Arrow
      down: 0x51,     // Down Arrow
      left: 0x50,     // Left Arrow
      right: 0x4F,    // Right Arrow
      north: 0x1A,    // W
      east: 0x07,     // D
      south: 0x16,    // S
      west: 0x04,     // A
      l: 0x14,        // Q
      r: 0x08,        // E
      start: 0x28,    // Enter
      select: 0x2C,   // Space
      home: 0x29,     // Escape
      share: 0x2B,    // Tab
      l3: 0x15,       // R
      r3: 0x09,       // F
    },
  },
  adcChannels: {
    donLeft: 0,   // ADC channel 0
    kaLeft: 1,    // ADC channel 1
    donRight: 2,  // ADC channel 2
    kaRight: 3,   // ADC channel 3
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
