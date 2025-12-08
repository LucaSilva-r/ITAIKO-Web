import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Download } from "lucide-react";

export function FirmwareUpdatePanel() {
  const { isConnected, firmwareUpdate } = useDevice();

  // Only show if connected and there's actually something to show (update available or in progress/error)
  const shouldShow = isConnected && (
    firmwareUpdate.status === 'available' || 
    firmwareUpdate.status !== 'idle' && firmwareUpdate.status !== 'checking'
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="py-4">
        {firmwareUpdate.status === 'available' && firmwareUpdate.latestRelease && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>New firmware available: {firmwareUpdate.latestRelease.tag_name}</span>
            </div>
            <div className="flex gap-2">
                <Button
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none"
                  onClick={() => firmwareUpdate.installUpdate()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Update Firmware
                </Button>
            </div>
          </div>
        )}
        
        {firmwareUpdate.status !== 'idle' && firmwareUpdate.status !== 'available' && firmwareUpdate.status !== 'checking' && (
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between text-sm font-medium text-amber-900">
               <span>Update Status:</span>
               <span className="capitalize">{firmwareUpdate.status.replace(/_/g, ' ')}</span>
             </div>
             
             {firmwareUpdate.error && (
               <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{firmwareUpdate.error}</p>
             )}

             {firmwareUpdate.status === 'downloading' && (
                <div className="h-2 w-full bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${firmwareUpdate.progress}%` }} />
                </div>
             )}
             
             {firmwareUpdate.status === 'waiting_for_device' && (
                <p className="text-sm text-amber-800">Please check the popup window to confirm device connection.</p>
             )}
             
             {firmwareUpdate.status === 'flashing' && (
                <p className="text-sm text-amber-800">Please select the RPI-RP2 drive to save the firmware file.</p>
             )}

             {firmwareUpdate.status === 'writing' && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-amber-800 animate-pulse">Copying firmware to device...</p>
                  <p className="text-xs text-amber-800">Do not unplug the device.</p>
                </div>
             )}

             {firmwareUpdate.status === 'manual_action_required' && (
                <div className="flex flex-col gap-2 p-3 bg-amber-100 rounded text-amber-900">
                  <p className="text-sm font-bold">Automatic download failed.</p>
                  <p className="text-sm">
                    1. The firmware file has been downloaded to your computer.
                  </p>
                  <p className="text-sm">
                    2. Please drag and drop it onto the "RPI-RP2" drive manually.
                  </p>
                </div>
             )}
           </div>
        )}
      </CardContent>
    </Card>
  );
}
