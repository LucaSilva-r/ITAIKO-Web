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
      delta: 0, // Will be calculated by streaming hook
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
// Also extracts version if present (Version:x.x.x)
export function parseSettingsResponse(response: string): {
  settings: Map<number, number>;
  version?: string;
} {
  const settings = new Map<number, number>();
  let version: string | undefined;
  const lines = response.trim().split("\n");

  for (const line of lines) {
    const match = line.match(/^(\d+):(\d+)/);
    if (match) {
      const key = parseInt(match[1], 10);
      const value = parseInt(match[2], 10);
      settings.set(key, value);
    } else if (line.startsWith("Version:")) {
      version = line.substring(8).trim();
    }
  }

  return { settings, version };
}

// Convert settings map to DeviceConfig
export function settingsToConfig(
  settings: Map<number, number>,
  version?: string
): DeviceConfig {
  const getPadThresholds = (pad: PadName) => ({
    light: settings.get(SETTING_INDICES.lightThreshold[pad]) ?? 800,
    heavy: settings.get(SETTING_INDICES.heavyThreshold[pad]) ?? 1200,
    cutoff: settings.get(SETTING_INDICES.cutoffThreshold[pad]) ?? 4095,
  });

  const config: DeviceConfig = {
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
    firmwareVersion: version,
  };

  // Add key mappings if present (firmware may not support them)
  if (settings.has(SETTING_INDICES.keyMapping.drumP1.kaLeft)) {
    config.keyMappings = {
      drumP1: {
        kaLeft: settings.get(SETTING_INDICES.keyMapping.drumP1.kaLeft) ?? 0,
        donLeft: settings.get(SETTING_INDICES.keyMapping.drumP1.donLeft) ?? 0,
        donRight: settings.get(SETTING_INDICES.keyMapping.drumP1.donRight) ?? 0,
        kaRight: settings.get(SETTING_INDICES.keyMapping.drumP1.kaRight) ?? 0,
      },
      drumP2: {
        kaLeft: settings.get(SETTING_INDICES.keyMapping.drumP2.kaLeft) ?? 0,
        donLeft: settings.get(SETTING_INDICES.keyMapping.drumP2.donLeft) ?? 0,
        donRight: settings.get(SETTING_INDICES.keyMapping.drumP2.donRight) ?? 0,
        kaRight: settings.get(SETTING_INDICES.keyMapping.drumP2.kaRight) ?? 0,
      },
      controller: {
        up: settings.get(SETTING_INDICES.keyMapping.controller.up) ?? 0,
        down: settings.get(SETTING_INDICES.keyMapping.controller.down) ?? 0,
        left: settings.get(SETTING_INDICES.keyMapping.controller.left) ?? 0,
        right: settings.get(SETTING_INDICES.keyMapping.controller.right) ?? 0,
        north: settings.get(SETTING_INDICES.keyMapping.controller.north) ?? 0,
        east: settings.get(SETTING_INDICES.keyMapping.controller.east) ?? 0,
        south: settings.get(SETTING_INDICES.keyMapping.controller.south) ?? 0,
        west: settings.get(SETTING_INDICES.keyMapping.controller.west) ?? 0,
        l: settings.get(SETTING_INDICES.keyMapping.controller.l) ?? 0,
        r: settings.get(SETTING_INDICES.keyMapping.controller.r) ?? 0,
        start: settings.get(SETTING_INDICES.keyMapping.controller.start) ?? 0,
        select: settings.get(SETTING_INDICES.keyMapping.controller.select) ?? 0,
        home: settings.get(SETTING_INDICES.keyMapping.controller.home) ?? 0,
        share: settings.get(SETTING_INDICES.keyMapping.controller.share) ?? 0,
        l3: settings.get(SETTING_INDICES.keyMapping.controller.l3) ?? 0,
        r3: settings.get(SETTING_INDICES.keyMapping.controller.r3) ?? 0,
      },
    };
  }

  return config;
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

  // Key mappings (18-41) - only if present
  if (config.keyMappings) {
    const km = config.keyMappings;
    pairs.push(`${SETTING_INDICES.keyMapping.drumP1.kaLeft}:${km.drumP1.kaLeft}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP1.donLeft}:${km.drumP1.donLeft}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP1.donRight}:${km.drumP1.donRight}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP1.kaRight}:${km.drumP1.kaRight}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP2.kaLeft}:${km.drumP2.kaLeft}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP2.donLeft}:${km.drumP2.donLeft}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP2.donRight}:${km.drumP2.donRight}`);
    pairs.push(`${SETTING_INDICES.keyMapping.drumP2.kaRight}:${km.drumP2.kaRight}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.up}:${km.controller.up}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.down}:${km.controller.down}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.left}:${km.controller.left}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.right}:${km.controller.right}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.north}:${km.controller.north}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.east}:${km.controller.east}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.south}:${km.controller.south}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.west}:${km.controller.west}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.l}:${km.controller.l}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.r}:${km.controller.r}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.start}:${km.controller.start}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.select}:${km.controller.select}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.home}:${km.controller.home}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.share}:${km.controller.share}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.l3}:${km.controller.l3}`);
    pairs.push(`${SETTING_INDICES.keyMapping.controller.r3}:${km.controller.r3}`);
  }

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
