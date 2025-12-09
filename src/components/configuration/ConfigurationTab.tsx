import { useEffect, useRef, useState } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PadConfigGroup } from "./PadConfigGroup";
import { TimingSettings } from "./TimingSettings";
import { ADCChannelSettings } from "./ADCChannelSettings";
import { KeyMappingSettings } from "./KeyMappingSettings";
import { ConfigActions } from "./ConfigActions";
import { PAD_NAMES, PAD_COLORS } from "@/types";
import { HelpButton } from "@/components/ui/help-modal";

// Pre-computed dim colors (30% brightness) for visual drum
const DIM_COLORS = {
  kaLeft: "rgb(32, 56, 59)",
  donLeft: "rgb(76, 19, 10)",
  donRight: "rgb(76, 19, 10)",
  kaRight: "rgb(32, 56, 59)",
};

export function ConfigurationTab() {
  const {
    config,
    setDoubleInputMode,
    isConnected,
    isReady,
    triggers,
    startStreaming,
    saveToFlash,
    configDirty,
  } = useDevice();
  const [advancedMode, setAdvancedMode] = useState(false);
  const isFirstRender = useRef(true);

  // Use ref to always have latest function without causing effect re-runs
  const startStreamingRef = useRef(startStreaming);
  useEffect(() => {
    startStreamingRef.current = startStreaming;
  });

  // Start streaming when device is ready (for visual drum)
  useEffect(() => {
    if (isReady) {
      startStreamingRef.current();
    }
  }, [isReady]);

  // Debounced auto-save: save to flash 500ms after config changes
  const saveToFlashRef = useRef(saveToFlash);
  useEffect(() => {
    saveToFlashRef.current = saveToFlash;
  });

  useEffect(() => {
    // Skip auto-save on first render (initial config load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only auto-save if connected and there are unsaved changes
    if (!isConnected || !configDirty) return;

    const timeoutId = setTimeout(() => {
      saveToFlashRef.current();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [config, isConnected, configDirty]);

  return (
    <div className="space-y-6">


      {/* Visual Drum */}
      <div className="flex flex-col items-center py-4">
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Ka Left - left half of outer ring */}
            <path
              d="M 100 10 A 90 90 0 0 0 100 190 L 100 170 A 70 70 0 0 1 100 30 Z"
              fill={triggers.kaLeft ? PAD_COLORS.kaLeft : DIM_COLORS.kaLeft}
            />
            {/* Ka Right - right half of outer ring */}
            <path
              d="M 100 10 A 90 90 0 0 1 100 190 L 100 170 A 70 70 0 0 0 100 30 Z"
              fill={triggers.kaRight ? PAD_COLORS.kaRight : DIM_COLORS.kaRight}
            />
            {/* Don Left - left half of inner circle */}
            <path
              d="M 100 30 A 70 70 0 0 0 100 170 L 100 100 Z"
              fill={triggers.donLeft ? PAD_COLORS.donLeft : DIM_COLORS.donLeft}
            />
            {/* Don Right - right half of inner circle */}
            <path
              d="M 100 30 A 70 70 0 0 1 100 170 L 100 100 Z"
              fill={triggers.donRight ? PAD_COLORS.donRight : DIM_COLORS.donRight}
            />
            {/* Center dividing line */}
            <line x1="100" y1="10" x2="100" y2="190" stroke="black" strokeWidth="2" />
          </svg>
        </div>
        {!isConnected && (
          <p className="text-sm text-muted-foreground mt-2">
            Connect the drum to see pad activity
          </p>
        )}
      </div>

      {/* Global Settings - Advanced only */}
      {advancedMode && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Global Settings
              <HelpButton helpKey="global-settings" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="double-mode">Allow Double Inputs</Label>
                <p className="text-sm text-muted-foreground">
                  Enable heavy trigger threshold for fast double hits
                </p>
              </div>
              <Switch
                id="double-mode"
                checked={config.doubleInputMode}
                onCheckedChange={setDoubleInputMode}
                disabled={!isConnected}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pad Configuration Grid */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          Pad Thresholds
          <HelpButton helpKey="pad-thresholds" />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PAD_NAMES.map((pad) => (
            <PadConfigGroup key={pad} pad={pad} simpleMode={!advancedMode} />
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      {advancedMode && (
        <>
          {/* Timing Settings */}
          <TimingSettings />

          {/* ADC Channel Mapping */}
          <ADCChannelSettings />

          {/* Key Mappings */}
          <KeyMappingSettings />
        </>
      )}

      {/* Config Actions & Mode Toggle */}
      <div className="flex items-center justify-between gap-4">
        <ConfigActions />
        <Card className="flex-1">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="advanced-mode">Advanced Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Show all configuration options
                </p>
              </div>
              <Switch
                id="advanced-mode"
                checked={advancedMode}
                onCheckedChange={setAdvancedMode}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
