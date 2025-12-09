import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { TimingConfig } from "@/types";
import { TIMING_MIN, TIMING_MAX } from "@/lib/default-config";
import { HelpButton } from "@/components/ui/help-modal";

interface TimingSettingProps {
  label: string;
  field: keyof TimingConfig;
  value: number;
  onChange: (field: keyof TimingConfig, value: number) => void;
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
    onChange(field, newValue[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(TIMING_MIN, Math.min(TIMING_MAX, parsed));
      onChange(field, clamped);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            onChange={handleInputChange}
            className="w-20 h-8 text-right"
            min={TIMING_MIN}
            max={TIMING_MAX}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground w-8">ms</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={TIMING_MIN}
        max={TIMING_MAX}
        step={1}
        disabled={disabled}
      />
    </div>
  );
}

export function TimingSettings() {
  const { config, updateTiming, isConnected } = useDevice();
  const timing = config.timing;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Timing Settings
          <HelpButton helpKey="timing-settings" />
        </CardTitle>
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
