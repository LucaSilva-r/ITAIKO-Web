// WebSerial Types
export const PICO_VENDOR_ID = 0x1209;
export const BAUD_RATE = 115200;

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SerialState {
  port: SerialPort | null;
  status: ConnectionStatus;
  error: string | null;
}

// Device Commands
export const DeviceCommand = {
  READ_SETTINGS: 1000,
  SAVE_TO_FLASH: 1001,
  WRITE_MODE: 1002,
  START_STREAMING: 2000,
  STOP_STREAMING: 2001,
} as const;

export type DeviceCommand = (typeof DeviceCommand)[keyof typeof DeviceCommand];

// Pad Types
export type PadName = "kaLeft" | "donLeft" | "donRight" | "kaRight";

export const PAD_NAMES: PadName[] = ["kaLeft", "donLeft", "donRight", "kaRight"];

export const PAD_LABELS: Record<PadName, string> = {
  kaLeft: "Ka Left",
  donLeft: "Don Left",
  donRight: "Don Right",
  kaRight: "Ka Right",
};

export const PAD_COLORS: Record<PadName, string> = {
  kaLeft: "#6bbdc6", // Cyan (rim)
  donLeft: "#ff4221", // Red (face)
  donRight: "#ff4221", // Red (face)
  kaRight: "#6bbdc6", // Cyan (rim)
};

// Streaming Data
export interface PadStreamData {
  triggered: boolean;
  raw: number;
  delta: number;
  duration: number;
}

export interface StreamFrame {
  timestamp: number;
  pads: Record<PadName, PadStreamData>;
}

// Graph Data Point (legacy - kept for compatibility)
export interface PadGraphPoint {
  time: number;
  raw: number;
  delta: number;
  duration: number;
}

// Zero-allocation buffer for streaming data
export interface PadBuffer {
  raw: Float32Array;
  delta: Float32Array;
  head: number;  // Next write position (circular)
  count: number; // Number of valid entries (0 to capacity)
  capacity: number;
}

export type PadBuffers = Record<PadName, PadBuffer>;

// Configuration Types
export interface PadThresholds {
  light: number; // 0-4095
  heavy: number; // 0-4095
  cutoff: number; // 0-4095
}

export interface TimingConfig {
  donDebounce: number; // ms (setting 4)
  kaDebounce: number; // ms (setting 5)
  crosstalkDebounce: number; // ms (setting 6)
  individualDebounce: number; // ms (setting 7)
  keyHoldTime: number; // ms (setting 8)
}

export interface DeviceConfig {
  pads: Record<PadName, PadThresholds>;
  doubleInputMode: boolean; // setting 9
  timing: TimingConfig;
}

// Monitor Settings (local UI state)
export interface MonitorSettings {
  refreshRate: number; // 10-1000ms
  historyBuffer: number; // 100-10000 samples
  csvLogging: boolean;
}

// Settings index mapping (firmware protocol)
export const SETTING_INDICES = {
  // Light thresholds (0-3)
  lightThreshold: {
    kaLeft: 0,
    donLeft: 1,
    donRight: 2,
    kaRight: 3,
  },
  // Timing (4-8)
  donDebounce: 4,
  kaDebounce: 5,
  crosstalkDebounce: 6,
  individualDebounce: 7,
  keyHoldTime: 8,
  // Double mode (9)
  doubleInputMode: 9,
  // Heavy thresholds (10-13)
  heavyThreshold: {
    kaLeft: 10,
    donLeft: 11,
    donRight: 12,
    kaRight: 13,
  },
  // Cutoff thresholds (14-17)
  cutoffThreshold: {
    kaLeft: 14,
    donLeft: 15,
    donRight: 16,
    kaRight: 17,
  },
} as const;
