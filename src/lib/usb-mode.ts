const USB_MODE_LABELS: Record<string, string> = {
  KEYBOARD_P1: "Keyboard P1",
  KEYBOARD_P2: "Keyboard P2",
  SWITCH_TATACON: "Switch Tatacon",
  PS4_TATACON: "PS4 Tatacon",
  XBOX360: "Xbox 360",
  USIO_TAIKO: "USIO Taiko",
  MIDI: "MIDI",
  DUALSHOCK3: "DualShock 3",
  UNKNOWN: "Unknown",
};

export function getUsbModeLabel(mode: string): string {
  return USB_MODE_LABELS[mode] ?? mode;
}
