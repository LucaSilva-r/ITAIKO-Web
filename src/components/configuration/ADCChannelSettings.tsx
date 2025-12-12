import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ADCChannels } from "@/types";
import { HelpButton } from "@/components/ui/help-modal";
import { RotateCcw } from "lucide-react";

interface ADCChannelSelectProps {
  label: string;
  pad: keyof ADCChannels;
  value: number;
  onChange: (pad: keyof ADCChannels, channel: number) => void;
  disabled?: boolean;
}

function ADCChannelSelect({
  label,
  pad,
  value,
  onChange,
  disabled,
}: ADCChannelSelectProps) {
  const handleValueChange = (valueStr: string) => {
    onChange(pad, parseInt(valueStr, 10));
  };

  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Select
        value={value.toString()}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Channel 0</SelectItem>
          <SelectItem value="1">Channel 1</SelectItem>
          <SelectItem value="2">Channel 2</SelectItem>
          <SelectItem value="3">Channel 3</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ADCChannelSettings() {
  const { config, updateADCChannel, isConnected, resetADCChannels } = useDevice();
  const adcChannels = config.adcChannels;

  // Don't render if ADC channels aren't supported by the firmware
  if (!adcChannels) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            ADC Channel Mapping
            <HelpButton helpKey="adc-channels" />

          </CardTitle>

          <Button
            variant="ghost"
            size="icon"
            onClick={resetADCChannels}
            disabled={!isConnected}
            title="Reset ADC channels to defaults"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Configure which ADC channels read each drum pad. Useful for older drums with different wiring.
        </CardDescription>
      </CardHeader>
      <CardContent>

        <div className="space-y-3">
          <ADCChannelSelect
            label="Don Left"
            pad="donLeft"
            value={adcChannels.donLeft}
            onChange={updateADCChannel}
            disabled={!isConnected}
          />
          <ADCChannelSelect
            label="Ka Left"
            pad="kaLeft"
            value={adcChannels.kaLeft}
            onChange={updateADCChannel}
            disabled={!isConnected}
          />
          <ADCChannelSelect
            label="Don Right"
            pad="donRight"
            value={adcChannels.donRight}
            onChange={updateADCChannel}
            disabled={!isConnected}
          />
          <ADCChannelSelect
            label="Ka Right"
            pad="kaRight"
            value={adcChannels.kaRight}
            onChange={updateADCChannel}
            disabled={!isConnected}
          />
        </div>
      </CardContent>
    </Card>
  );
}
