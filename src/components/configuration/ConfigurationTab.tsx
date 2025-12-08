import { useEffect, useRef } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PadConfigGroup } from "./PadConfigGroup";
import { TimingSettings } from "./TimingSettings";
import { ADCChannelSettings } from "./ADCChannelSettings";
import { KeyMappingSettings } from "./KeyMappingSettings";
import { ConfigActions } from "./ConfigActions";
import { PAD_NAMES } from "@/types";

export function ConfigurationTab() {
  const { config, setDoubleInputMode, isConnected, stopStreaming } = useDevice();

  // Use ref to always have latest function without causing effect re-runs
  const stopStreamingRef = useRef(stopStreaming);
  useEffect(() => {
    stopStreamingRef.current = stopStreaming;
  });

  // Stop streaming when entering config tab
  useEffect(() => {
    stopStreamingRef.current();
  }, []);

  return (
    <div className="space-y-6">
      {/* Config Actions */}
      <ConfigActions />

      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Global Settings</CardTitle>
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

      {/* Pad Configuration Grid */}
      <div>
        <h3 className="font-medium mb-3">Pad Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PAD_NAMES.map((pad) => (
            <PadConfigGroup key={pad} pad={pad} />
          ))}
        </div>
      </div>

      {/* Timing Settings */}
      <TimingSettings />

      {/* ADC Channel Mapping */}
      <ADCChannelSettings />

      {/* Key Mappings */}
      <KeyMappingSettings />
    </div>
  );
}
