import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { PadName } from "@/types";
import { PAD_LABELS, PAD_COLORS } from "@/types";
import { THRESHOLD_MIN, THRESHOLD_MAX } from "@/lib/default-config";

interface PadConfigGroupProps {
  pad: PadName;
  simpleMode?: boolean;
}

export function PadConfigGroup({ pad, simpleMode = false }: PadConfigGroupProps) {
  const { config, updatePadThreshold, isConnected } = useDevice();
  const thresholds = config.pads[pad];
  const showHeavy = config.doubleInputMode && !simpleMode;

  const handleSliderChange = (
    field: "light" | "heavy" | "cutoff",
    value: number[]
  ) => {
    updatePadThreshold(pad, field, value[0]);
  };

  const handleInputChange = (
    field: "light" | "heavy" | "cutoff",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      const clamped = Math.max(THRESHOLD_MIN, Math.min(THRESHOLD_MAX, value));
      updatePadThreshold(pad, field, clamped);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: PAD_COLORS[pad] }}
          />
          {PAD_LABELS[pad]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Light Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${pad}-light`} className="text-sm">
              Light Trigger
            </Label>
            <Input
              id={`${pad}-light`}
              type="number"
              value={thresholds.light}
              onChange={(e) => handleInputChange("light", e)}
              className="w-20 h-8 text-right"
              min={THRESHOLD_MIN}
              max={THRESHOLD_MAX}
              disabled={!isConnected}
            />
          </div>
          <Slider
            value={[thresholds.light]}
            onValueChange={(v) => handleSliderChange("light", v)}
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={1}
            disabled={!isConnected}
          />
        </div>

        {/* Heavy Threshold (only when double mode enabled) */}
        {showHeavy && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${pad}-heavy`} className="text-sm">
                Heavy Trigger
              </Label>
              <Input
                id={`${pad}-heavy`}
                type="number"
                value={thresholds.heavy}
                onChange={(e) => handleInputChange("heavy", e)}
                className="w-20 h-8 text-right"
                min={THRESHOLD_MIN}
                max={THRESHOLD_MAX}
                disabled={!isConnected}
              />
            </div>
            <Slider
              value={[thresholds.heavy]}
              onValueChange={(v) => handleSliderChange("heavy", v)}
              min={THRESHOLD_MIN}
              max={THRESHOLD_MAX}
              step={1}
              disabled={!isConnected}
            />
          </div>
        )}

        {/* Cutoff Threshold - Advanced only */}
        {!simpleMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${pad}-cutoff`} className="text-sm">
                Cutoff
              </Label>
              <Input
                id={`${pad}-cutoff`}
                type="number"
                value={thresholds.cutoff}
                onChange={(e) => handleInputChange("cutoff", e)}
                className="w-20 h-8 text-right"
                min={THRESHOLD_MIN}
                max={THRESHOLD_MAX}
                disabled={!isConnected}
              />
            </div>
            <Slider
              value={[thresholds.cutoff]}
              onValueChange={(v) => handleSliderChange("cutoff", v)}
              min={THRESHOLD_MIN}
              max={THRESHOLD_MAX}
              step={1}
              disabled={!isConnected}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
