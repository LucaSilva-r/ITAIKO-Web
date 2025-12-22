import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Download } from "lucide-react";

export function FirmwareUpdatePanel() {
  const { isConnected, firmwareUpdate } = useDevice();
  const { status, latestFirmware, setModalOpen } = firmwareUpdate;

  // Only show if connected and update is available
  const shouldShow = isConnected && status === 'available';

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="z-50 animate-in slide-in-from-top-5 fade-in duration-300">
      <Card className="border-amber-500/50 bg-amber-500/10 shadow-md backdrop-blur-sm">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-600 font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Update v{latestFirmware?.version} available</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className=" bg-amber-600 hover:bg-amber-700 text-white hover:text-white border-none rounded-sm"
            onClick={() => setModalOpen(true)}
          >
            <Download className="mr-1.5 h-3 w-3" />
            Update
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
