import { useState, useEffect, useRef } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { KeyMappings } from "@/types";
import { hidToKeyName, browserKeyToHid } from "@/lib/hid-keycodes";

interface KeyMappingInputProps {
  label: string;
  category: keyof KeyMappings;
  keyName: string;
  value: number;
  onChange: (category: keyof KeyMappings, key: string, value: number) => void;
  disabled?: boolean;
}

function KeyMappingInput({
  label,
  category,
  keyName,
  value,
  onChange,
  disabled,
}: KeyMappingInputProps) {
  const [isListening, setIsListening] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle key press when listening
  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const hidCode = browserKeyToHid(e);
      if (hidCode !== null) {
        onChange(category, keyName, hidCode);
        setIsListening(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsListening(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isListening, category, keyName, onChange]);

  const handleClick = () => {
    if (!disabled) {
      setIsListening(true);
    }
  };

  const displayText = isListening ? "Press any key..." : hidToKeyName(value);

  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Button
        ref={buttonRef}
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={`w-32 h-8 font-mono ${
          isListening ? "animate-pulse" : ""
        }`}
      >
        {displayText}
      </Button>
    </div>
  );
}

export function KeyMappingSettings() {
  const { config, updateKeyMapping, isConnected } = useDevice();
  const keyMappings = config.keyMappings;

  // Don't render if key mappings aren't supported by the firmware
  if (!keyMappings) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Key Mappings</h3>
      <p className="text-sm text-muted-foreground -mt-2">
        Click any button and press a key to assign it. Click outside to cancel.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Drum Player 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Drum Player 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyMappingInput
              label="Ka Left"
              category="drumP1"
              keyName="kaLeft"
              value={keyMappings.drumP1.kaLeft}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Don Left"
              category="drumP1"
              keyName="donLeft"
              value={keyMappings.drumP1.donLeft}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Don Right"
              category="drumP1"
              keyName="donRight"
              value={keyMappings.drumP1.donRight}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Ka Right"
              category="drumP1"
              keyName="kaRight"
              value={keyMappings.drumP1.kaRight}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>

        {/* Drum Player 2 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Drum Player 2</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyMappingInput
              label="Ka Left"
              category="drumP2"
              keyName="kaLeft"
              value={keyMappings.drumP2.kaLeft}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Don Left"
              category="drumP2"
              keyName="donLeft"
              value={keyMappings.drumP2.donLeft}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Don Right"
              category="drumP2"
              keyName="donRight"
              value={keyMappings.drumP2.donRight}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Ka Right"
              category="drumP2"
              keyName="kaRight"
              value={keyMappings.drumP2.kaRight}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>

        {/* Controller Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Controller D-Pad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyMappingInput
              label="Up"
              category="controller"
              keyName="up"
              value={keyMappings.controller.up}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Down"
              category="controller"
              keyName="down"
              value={keyMappings.controller.down}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Left"
              category="controller"
              keyName="left"
              value={keyMappings.controller.left}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Right"
              category="controller"
              keyName="right"
              value={keyMappings.controller.right}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Controller Action Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyMappingInput
              label="North (Y/Triangle)"
              category="controller"
              keyName="north"
              value={keyMappings.controller.north}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="East (B/Circle)"
              category="controller"
              keyName="east"
              value={keyMappings.controller.east}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="South (A/Cross)"
              category="controller"
              keyName="south"
              value={keyMappings.controller.south}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="West (X/Square)"
              category="controller"
              keyName="west"
              value={keyMappings.controller.west}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>

        {/* System Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Controller System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyMappingInput
              label="Start"
              category="controller"
              keyName="start"
              value={keyMappings.controller.start}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Select"
              category="controller"
              keyName="select"
              value={keyMappings.controller.select}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Home"
              category="controller"
              keyName="home"
              value={keyMappings.controller.home}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="Share"
              category="controller"
              keyName="share"
              value={keyMappings.controller.share}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shoulder Buttons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Controller Shoulder & Stick</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyMappingInput
              label="L (Left Shoulder)"
              category="controller"
              keyName="l"
              value={keyMappings.controller.l}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="R (Right Shoulder)"
              category="controller"
              keyName="r"
              value={keyMappings.controller.r}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="L3 (Left Stick)"
              category="controller"
              keyName="l3"
              value={keyMappings.controller.l3}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
            <KeyMappingInput
              label="R3 (Right Stick)"
              category="controller"
              keyName="r3"
              value={keyMappings.controller.r3}
              onChange={updateKeyMapping}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
