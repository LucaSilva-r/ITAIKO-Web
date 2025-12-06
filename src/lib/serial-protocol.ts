import type {
  DeviceConfig,
  PadName,
  PadStreamData,
  StreamFrame,
  DeviceCommand,
} from "@/types";
import { PAD_NAMES, SETTING_INDICES } from "@/types";

// Parse a single streaming CSV line into pad data
// Format: triggered,raw,duration (repeated 4 times for Ka_L, Don_L, Don_R, Ka_R)
// Example: F,200,0,T,1000,45,F,300,0,F,254,0
export function parseStreamLine(line: string): StreamFrame | null {
  const parts = line.trim().split(",");
  if (parts.length !== 12) return null;

  const pads: Record<PadName, PadStreamData> = {} as Record<PadName, PadStreamData>;

  PAD_NAMES.forEach((pad, index) => {
    const offset = index * 3;
    const triggeredChar = parts[offset];
    const raw = parseInt(parts[offset + 1], 10);
    const duration = parseInt(parts[offset + 2], 10);

    if (isNaN(raw) || isNaN(duration)) return null;

    pads[pad] = {
      triggered: triggeredChar === "T" || triggeredChar === "1",
      raw,
      duration,
    };
  });

  return {
    timestamp: Date.now(),
    pads,
  };
}

// Parse settings response from device
// Format: key:value lines (0:800, 1:800, etc.)
export function parseSettingsResponse(response: string): Map<number, number> {
  const settings = new Map<number, number>();
  const lines = response.trim().split("\n");

  for (const line of lines) {
    const match = line.match(/^(\d+):(\d+)/);
    if (match) {
      const key = parseInt(match[1], 10);
      const value = parseInt(match[2], 10);
      settings.set(key, value);
    }
  }

  return settings;
}

// Convert settings map to DeviceConfig
export function settingsToConfig(settings: Map<number, number>): DeviceConfig {
  const getPadThresholds = (pad: PadName) => ({
    light: settings.get(SETTING_INDICES.lightThreshold[pad]) ?? 800,
    heavy: settings.get(SETTING_INDICES.heavyThreshold[pad]) ?? 1200,
    cutoff: settings.get(SETTING_INDICES.cutoffThreshold[pad]) ?? 4095,
  });

  return {
    pads: {
      kaLeft: getPadThresholds("kaLeft"),
      donLeft: getPadThresholds("donLeft"),
      donRight: getPadThresholds("donRight"),
      kaRight: getPadThresholds("kaRight"),
    },
    doubleInputMode: (settings.get(SETTING_INDICES.doubleInputMode) ?? 0) === 1,
    timing: {
      donDebounce: settings.get(SETTING_INDICES.donDebounce) ?? 30,
      kaDebounce: settings.get(SETTING_INDICES.kaDebounce) ?? 30,
      crosstalkDebounce: settings.get(SETTING_INDICES.crosstalkDebounce) ?? 30,
      individualDebounce: settings.get(SETTING_INDICES.individualDebounce) ?? 19,
      keyHoldTime: settings.get(SETTING_INDICES.keyHoldTime) ?? 25,
    },
  };
}

// Convert DeviceConfig to settings string for writing
// Format: 0:800 1:800 2:800 ... (space-separated key:value pairs)
export function configToSettingsString(config: DeviceConfig): string {
  const pairs: string[] = [];

  // Light thresholds (0-3)
  PAD_NAMES.forEach((pad) => {
    const index = SETTING_INDICES.lightThreshold[pad];
    pairs.push(`${index}:${config.pads[pad].light}`);
  });

  // Timing (4-8)
  pairs.push(`${SETTING_INDICES.donDebounce}:${config.timing.donDebounce}`);
  pairs.push(`${SETTING_INDICES.kaDebounce}:${config.timing.kaDebounce}`);
  pairs.push(`${SETTING_INDICES.crosstalkDebounce}:${config.timing.crosstalkDebounce}`);
  pairs.push(`${SETTING_INDICES.individualDebounce}:${config.timing.individualDebounce}`);
  pairs.push(`${SETTING_INDICES.keyHoldTime}:${config.timing.keyHoldTime}`);

  // Double mode (9)
  pairs.push(`${SETTING_INDICES.doubleInputMode}:${config.doubleInputMode ? 1 : 0}`);

  // Heavy thresholds (10-13)
  PAD_NAMES.forEach((pad) => {
    const index = SETTING_INDICES.heavyThreshold[pad];
    pairs.push(`${index}:${config.pads[pad].heavy}`);
  });

  // Cutoff thresholds (14-17)
  PAD_NAMES.forEach((pad) => {
    const index = SETTING_INDICES.cutoffThreshold[pad];
    pairs.push(`${index}:${config.pads[pad].cutoff}`);
  });

  // Sort by index
  pairs.sort((a, b) => {
    const indexA = parseInt(a.split(":")[0], 10);
    const indexB = parseInt(b.split(":")[0], 10);
    return indexA - indexB;
  });

  return pairs.join(" ");
}

// Build command string
export function buildCommand(command: DeviceCommand, data?: string): string {
  if (data) {
    return `${command}\n${data}\n`;
  }
  return `${command}\n`;
}

// Encode string to Uint8Array for serial write
export function encodeCommand(command: string): Uint8Array {
  return new TextEncoder().encode(command);
}

// Decode Uint8Array to string for serial read
export function decodeResponse(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}
