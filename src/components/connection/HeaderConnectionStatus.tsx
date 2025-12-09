import { useEffect, useState } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Usb, AlertCircle, Skull } from "lucide-react";
import { toast } from "sonner";
import { EmergencyRecoveryModal } from "./EmergencyRecoveryModal";

export function HeaderConnectionStatus() {
  const {
    status,
    error,
    isSupported,
    isConnected,
    requestPort,
    connect,
    disconnect,
    config,
  } = useDevice();

  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

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
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">WebSerial not supported</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Usb className="h-4 w-4 text-muted-foreground" />
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
        className="text-xs"
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
        <span className="text-xs text-muted-foreground font-mono">
          v{config.firmwareVersion}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setRecoveryModalOpen(true)}
        title="Emergency Recovery"
        className="h-8 w-8 text-destructive hover:text-destructive"
      >
        <Skull className="h-4 w-4" />
      </Button>
      <Button
        onClick={handleConnect}
        variant={isConnected ? "ghost" : "default"}
        size="sm"
        disabled={status === "connecting"}
      >
        {isConnected ? "Disconnect" : "Connect"}
      </Button>

      <EmergencyRecoveryModal
        open={recoveryModalOpen}
        onOpenChange={setRecoveryModalOpen}
      />
    </div>
  );
}
