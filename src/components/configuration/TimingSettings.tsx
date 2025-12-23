import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { NumberInput } from "@/components/ui/numberinput";
import { Button } from "@/components/ui/button";
import type { TimingConfig } from "@/types";
import { TIMING_MIN, TIMING_MAX } from "@/lib/default-config";
import { HelpButton } from "@/components/ui/help-modal";
import { RotateCcw } from "lucide-react";

interface TimingSettingProps {
  label: string;
  field: keyof TimingConfig;
  value: number;
  onChange: (field: keyof TimingConfig, value: number, commit?: boolean) => void;
  disabled?: boolean;
}

function TimingSetting({
  label,
  field,
  value,
  onChange,
  disabled,
}: TimingSettingProps) {
  const handleSliderChange = (newValue: number[]) => {
    onChange(field, newValue[0], false);
  };

  const handleSliderCommit = (newValue: number[]) => {
    onChange(field, newValue[0], true);
  };

  const handleValueChange = (val: number | undefined) => {
    if (val !== undefined) {
      onChange(field, val, true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-1">
          <NumberInput
            value={value}
            onValueChange={handleValueChange}
            className="w-24"
            min={TIMING_MIN}
            max={TIMING_MAX}
            disabled={disabled}
            suffix=" ms"
          />
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        min={TIMING_MIN}
        max={TIMING_MAX}
        step={5}
        disabled={disabled}
        
      />
    </div>
  );
}

export function TimingSettings() {
  const { config, updateTiming, isConnected, resetTiming } = useDevice();
  const timing = config.timing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Timing Settings
            <HelpButton helpKey="timing-settings" />
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTiming}
            disabled={!isConnected}
            title="Reset timing to defaults"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TimingSetting
          label="Key Hold Time"
          field="keyHoldTime"
          value={timing.keyHoldTime}
          onChange={updateTiming}
          disabled={!isConnected}
        />
        <TimingSetting
          label="Don Debounce"
          field="donDebounce"
          value={timing.donDebounce}
          onChange={updateTiming}
          disabled={!isConnected}
        />
        <TimingSetting
          label="Ka Debounce"
          field="kaDebounce"
          value={timing.kaDebounce}
          onChange={updateTiming}
          disabled={!isConnected}
        />
        <TimingSetting
          label="Crosstalk Debounce"
          field="crosstalkDebounce"
          value={timing.crosstalkDebounce}
          onChange={updateTiming}
          disabled={!isConnected}
        />
        <TimingSetting
          label="Individual Debounce"
          field="individualDebounce"
          value={timing.individualDebounce}
          onChange={updateTiming}
          disabled={!isConnected}
        />
      </CardContent>
    </Card>
  );
}