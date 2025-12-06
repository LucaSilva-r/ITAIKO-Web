import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Usb, AlertCircle } from "lucide-react";

export function ConnectionPanel() {
  const {
    status,
    error,
    isSupported,
    isConnected,
    requestPort,
    connect,
    disconnect,
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
          </div>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>

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
