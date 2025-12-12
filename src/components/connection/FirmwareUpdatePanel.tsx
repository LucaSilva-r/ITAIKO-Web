import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Download, RefreshCw } from "lucide-react";

export function FirmwareUpdatePanel() {
  const { isConnected, firmwareUpdate } = useDevice();
  const { status, latestFirmware, setModalOpen } = firmwareUpdate;

  // Only show if connected and there's actually something to show (update available or in progress/error)
  const shouldShow = isConnected && (
    status === 'available' ||
    (status !== 'idle' && status !== 'checking')
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="py-4">
        {status === 'available' && latestFirmware && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>New firmware available: v{latestFirmware.version}</span>
            </div>
            <div className="flex gap-2">
                <Button
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none"
                  onClick={() => setModalOpen(true)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Review & Update
                </Button>
            </div>
          </div>
        )}
        
        {status !== 'available' && (
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                 <RefreshCw className="h-4 w-4 animate-spin" />
                 <span className="capitalize">{status.replace(/_/g, ' ')}...</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                View Progress
              </Button>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
