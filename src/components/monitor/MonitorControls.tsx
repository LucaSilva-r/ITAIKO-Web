import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Trash2 } from "lucide-react";

export function MonitorControls() {
  const {
    isConnected,
    isStreaming,
    startStreaming,
    stopStreaming,
    clearData,
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
      </CardContent>
    </Card>
  );
}
