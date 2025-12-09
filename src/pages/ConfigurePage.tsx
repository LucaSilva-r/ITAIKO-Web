import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceProvider } from "@/context/DeviceContext";
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

  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen flex flex-col w-full items-center">
      <FirmwareUpdateModal />
      {/* Header with connection status */}
      <header className="border-b w-full">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="font-bold text-xl">
            <img src="itaiko.png" className="pixelated drag-none" alt="Logo" />
          </Link>
          <HeaderConnectionStatus />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 w-full max-w-5xl py-6 flex-1">
        <Tabs
          value={currentTab}
          onValueChange={onTabChange}
          className="flex flex-col h-full"
        >
          {/* Tab Content */}
          <TabsContent value="config" className="flex-1 mt-0">
            <ConfigurationTab />
          </TabsContent>

          <TabsContent value="monitor" className="flex-1 mt-0">
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
  );
}

export function ConfigurePage() {
  return (
    <DeviceProvider>
      <ConfigurePageContent />
    </DeviceProvider>
  );
}