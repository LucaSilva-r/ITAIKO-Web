import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceProvider, useDevice } from "@/context/DeviceContext";
import { HeaderConnectionStatus } from "@/components/connection/HeaderConnectionStatus";
import { FirmwareUpdatePanel } from "@/components/connection/FirmwareUpdatePanel";
import { FirmwareUpdateModal } from "@/components/connection/FirmwareUpdateModal";
import { ConfigurationTab } from "@/components/configuration/ConfigurationTab";
import { LiveMonitorTab } from "@/components/monitor/LiveMonitorTab";
import { initializeHelpContent } from "@/lib/help-content";

// Initialize help content
initializeHelpContent();

function ConfigurePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "config";
  const { isReady } = useDevice();

  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="h-screen flex flex-col w-full">
      <FirmwareUpdateModal />
      {/* Header with connection status - fixed height */}
      <header className="border-b w-full flex-shrink-0">
        <div className="flex h-14 items-center justify-between px-4 max-w-5xl mx-auto w-full">
          <Link to="/" className="font-bold text-xl">
            <img src="itaiko.png" className="pixelated drag-none" alt="Logo" />
          </Link>
          <HeaderConnectionStatus />
        </div>
      </header>

      {/* Main Content - scrollable area (overflow hidden when overlay shown) */}
      <div className={`flex-1 relative ${isReady ? 'overflow-auto' : 'overflow-hidden'}`}>
        {/* Blur overlay when not connected/ready */}
        {!isReady && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <p className="text-xl font-medium text-foreground">Connect your drum</p>
              <p className="text-sm text-muted-foreground">Configuration will appear once connected</p>
            </div>
          </div>
        )}

        <main className="px-4 w-full max-w-5xl mx-auto py-6">
          <Tabs
            value={currentTab}
            onValueChange={onTabChange}
            className="flex flex-col"
          >
            {/* Tab Content */}
            <TabsContent value="config" className="mt-0">
              <ConfigurationTab />
            </TabsContent>

            <TabsContent value="monitor" className="mt-0">
              <LiveMonitorTab />
            </TabsContent>

            {/* Firmware Update Panel */}
            <FirmwareUpdatePanel />

            {/* Tabs at bottom */}
            <TabsList className="grid w-full grid-cols-2 mt-6">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="monitor">Live Monitor</TabsTrigger>
            </TabsList>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export function ConfigurePage() {
  return (
    <DeviceProvider>
      <ConfigurePageContent />
    </DeviceProvider>
  );
}