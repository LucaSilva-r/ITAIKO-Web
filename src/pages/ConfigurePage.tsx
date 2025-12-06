import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceProvider } from "@/context/DeviceContext";
import { ConnectionPanel } from "@/components/connection/ConnectionPanel";
import { ConfigurationTab } from "@/components/configuration/ConfigurationTab";
import { LiveMonitorTab } from "@/components/monitor/LiveMonitorTab";
import { VisualDrumTab } from "@/components/visual/VisualDrumTab";

function ConfigurePageContent() {
  return (
    <div className="min-h-screen flex flex-col w-full items-center">
      {/* Header */}
      <header className="border-b w-full">
        <div className="flex h-14 items-center justify-between p-4">
          <Link to="/" className="font-bold text-xl">
            <img src="itaiko.png" className="pixelated drag-none" ></img>
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/">Home</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-5xl py-6">
        {/* Connection Panel */}
        <div className="mb-6">
          <ConnectionPanel />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="config" className="space-y-4">
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
