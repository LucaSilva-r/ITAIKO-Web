import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Usb, AlertCircle, HardDriveDownload, Download } from "lucide-react";

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
    firmwareUpdate,
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
            
            {isConnected && firmwareUpdate.status === 'available' && firmwareUpdate.latestRelease && (
              <div className="flex flex-col gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>New firmware available: {firmwareUpdate.latestRelease.tag_name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-amber-500 hover:text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                  onClick={() => firmwareUpdate.installUpdate()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Update Firmware
                </Button>
              </div>
            )}
            
            {firmwareUpdate.status !== 'idle' && firmwareUpdate.status !== 'available' && firmwareUpdate.status !== 'checking' && (
               <div className="flex flex-col gap-2 p-3 bg-muted/50 border rounded-md">
                 <div className="flex items-center justify-between text-xs font-medium">
                   <span>Update Status:</span>
                   <span className="capitalize">{firmwareUpdate.status.replace(/_/g, ' ')}</span>
                 </div>
                 {firmwareUpdate.error && (
                   <p className="text-xs text-destructive">{firmwareUpdate.error}</p>
                 )}
                 {firmwareUpdate.status === 'downloading' && (
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${firmwareUpdate.progress}%` }} />
                    </div>
                 )}
                 {firmwareUpdate.status === 'waiting_for_device' && (
                    <p className="text-xs text-muted-foreground">Please check the popup window to confirm device connection.</p>
                 )}
                 {firmwareUpdate.status === 'flashing' && (
                    <p className="text-xs text-muted-foreground">Please select the RPI-RP2 drive to save the firmware file.</p>
                 )}
                 {firmwareUpdate.status === 'manual_action_required' && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-amber-600 font-medium">Automatic download failed.</p>
                      <p className="text-xs text-muted-foreground">
                        1. The firmware file has been downloaded to your computer.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        2. Please drag and drop it onto the "RPI-RP2" drive.
                      </p>
                    </div>
                 )}
               </div>
            )}
            
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
