import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, RotateCcw, Save } from "lucide-react";

export function ConfigActions() {
  const {
    isConnected,
    configLoading,
    configDirty,
    readFromDevice,
    saveToFlash,
    resetToDefaults,
  } = useDevice();

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-3 py-4">
        <Button
          variant="outline"
          onClick={readFromDevice}
          disabled={!isConnected || configLoading}
        >
          <Download className="h-4 w-4 mr-2" />
          Read from Device
        </Button>

        <Button
          onClick={saveToFlash}
          disabled={!isConnected || configLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          Write & Save
          {configDirty && <span className="ml-1 text-xs">(unsaved)</span>}
        </Button>

        <Button
          variant="secondary"
          onClick={resetToDefaults}
          disabled={configLoading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
