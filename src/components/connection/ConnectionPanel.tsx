import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Usb, AlertCircle, HardDriveDownload } from "lucide-react";

export function ConnectionPanel() {
  const {
    status,
    error,
    isSupported,
    isConnected,
    requestPort,
    connect,
    disconnect,
    config,
    rebootToBootsel,
  } = useDevice();

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      const port = await requestPort();
      if (port) {
        await connect();
      }
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="font-medium">WebSerial Not Supported</p>
            <p className="text-sm text-muted-foreground">
              Please use Chrome, Edge, or Opera to configure your drum.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <Usb className="h-5 w-5 text-muted-foreground" />

        <div className="flex-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Device Connection</span>
              <Badge
                variant={
                  status === "connected"
                    ? "default"
                    : status === "connecting"
                      ? "secondary"
                      : status === "error"
                        ? "destructive"
                        : "outline"
                }
              >
                {status === "connected"
                  ? "Connected"
                  : status === "connecting"
                    ? "Connecting..."
                    : status === "error"
                      ? "Error"
                      : "Disconnected"}
              </Badge>
              {isConnected && config.firmwareVersion && (
                <span className="text-xs text-muted-foreground font-mono border rounded px-1.5 py-0.5 bg-muted/50">
                  v{config.firmwareVersion}
                </span>
              )}
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        {isConnected && (
          <Button
            variant="outline"
            size="icon"
            onClick={rebootToBootsel}
            title="Reboot to Bootloader"
          >
            <HardDriveDownload className="h-4 w-4" />
          </Button>
        )}

        <Button
          onClick={handleConnect}
          variant={isConnected ? "outline" : "default"}
          disabled={status === "connecting"}
        >
          {isConnected ? "Disconnect" : "Connect"}
        </Button>
      </CardContent>
    </Card>
  );
}
