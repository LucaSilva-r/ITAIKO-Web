import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Usb, AlertCircle, Skull } from "lucide-react";
import { toast } from "sonner";
import { EmergencyRecoveryModal } from "./EmergencyRecoveryModal";
import { getUsbModeLabel } from "@/lib/usb-mode";

export function ConnectionPanel() {
  const { t } = useTranslation("connection");
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

  // Show error as toast instead of inline
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
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="font-medium">{t("connectionPanel.notSupported.title")}</p>
            <p className="text-sm text-muted-foreground">
              {t("connectionPanel.notSupported.description")}
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
              <span className="font-medium">{t("connectionPanel.deviceConnection")}</span>
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
                  ? t("connectionPanel.status.connected")
                  : status === "connecting"
                    ? t("connectionPanel.status.connecting")
                    : status === "error"
                      ? t("connectionPanel.status.error")
                      : t("connectionPanel.status.disconnected")}
              </Badge>
              {isConnected && config.firmwareVersion && (
                <span className="text-xs text-muted-foreground font-mono border rounded px-1.5 py-0.5 bg-muted/50">
                  v{config.firmwareVersion}
                </span>
              )}
              {isConnected && config.usbMode && (
                <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/50">
                  {t("connectionPanel.deviceMode", {
                    mode: getUsbModeLabel(config.usbMode),
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          size="icon"
          onClick={() => setRecoveryModalOpen(true)}
          title={t("connectionPanel.emergencyRecoveryTitle")}
          className="bg-red-600 hover:bg-red-700 border-red-800"
        >
          <Skull className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleConnect}
          variant={isConnected ? "outline" : "default"}
          disabled={status === "connecting"}
        >
          {isConnected ? t("connectionPanel.disconnect") : t("connectionPanel.connect")}
        </Button>
      </CardContent>

      <EmergencyRecoveryModal
        open={recoveryModalOpen}
        onOpenChange={setRecoveryModalOpen}
      />
    </Card>
  );
}
