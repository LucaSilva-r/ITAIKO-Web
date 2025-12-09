import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceProvider } from "@/context/DeviceContext";
import { ConnectionPanel } from "@/components/connection/ConnectionPanel";
import { FirmwareUpdatePanel } from "@/components/connection/FirmwareUpdatePanel";
import { FirmwareUpdateModal } from "@/components/connection/FirmwareUpdateModal";
import { ConfigurationTab } from "@/components/configuration/ConfigurationTab";
import { LiveMonitorTab } from "@/components/monitor/LiveMonitorTab";
import { VisualDrumTab } from "@/components/visual/VisualDrumTab";
import { initializeHelpContent } from "@/lib/help-content";

// Initialize help content
initializeHelpContent();

function ConfigurePageContent() {
  // 2. Initialize the search params hook
  const [searchParams, setSearchParams] = useSearchParams();

  // 3. Determine the current tab. 
  // If 'tab' param exists, use it; otherwise default to "config"
  const currentTab = searchParams.get("tab") || "config";

  // 4. Create a handler to update the URL when the tab changes
  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  return (
    <div className="min-h-screen flex flex-col w-full items-center">
      <FirmwareUpdateModal />
      {/* Header */}
      <header className="border-b w-full">
        <div className="flex h-14 items-center justify-between p-4">
          <Link to="/" className="font-bold text-xl">
            <img src="itaiko.png" className="pixelated drag-none" alt="Logo" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 w-full max-w-5xl py-6">
        {/* Connection Panel */}
        <div className="mb-6 space-y-4">
          <ConnectionPanel />
          <FirmwareUpdatePanel />
        </div>

        {/* Main Tabs */}
        {/* 5. Switch from 'defaultValue' to controlled 'value' and 'onValueChange' */}
        <Tabs 
          value={currentTab} 
          onValueChange={onTabChange} 
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitor">Live Monitor</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="visual">Visual Drum</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-4">
            <LiveMonitorTab />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <ConfigurationTab />
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <VisualDrumTab />
          </TabsContent>
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