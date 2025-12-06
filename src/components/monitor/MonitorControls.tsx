import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Trash2 } from "lucide-react";
import {
  HISTORY_BUFFER_MIN,
  HISTORY_BUFFER_MAX,
} from "@/lib/default-config";

export function MonitorControls() {
  const {
    isConnected,
    isStreaming,
    startStreaming,
    stopStreaming,
    clearData,
    maxBufferSize,
    setMaxBufferSize,
  } = useDevice();

  const handleTogglePause = async () => {
    if (isStreaming) {
      await stopStreaming();
    } else {
      await startStreaming();
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 py-4">
        {/* Pause/Resume Control */}
        <div className="flex items-center gap-2">
          <Button
            variant={isStreaming ? "secondary" : "default"}
            onClick={handleTogglePause}
            disabled={!isConnected}
          >
            {isStreaming ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={clearData}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* History Buffer */}
        <div className="flex items-center gap-3 flex-1 min-w-48">
          <Label className="text-sm whitespace-nowrap">Buffer:</Label>
          <Slider
            value={[maxBufferSize]}
            onValueChange={(v) => setMaxBufferSize(v[0])}
            min={HISTORY_BUFFER_MIN}
            max={HISTORY_BUFFER_MAX}
            step={100}
            className="flex-1"
            disabled={isStreaming}
          />
          <span className="text-sm text-muted-foreground w-16 text-right">
            {maxBufferSize}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
