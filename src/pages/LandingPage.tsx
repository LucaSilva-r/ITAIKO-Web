import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drum, Settings, Activity, Usb } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Wave Border */}
      <div className="seigaiha-border" />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center gap-12 p-8">
        <div className="text-center space-y-4 items-center flex flex-col">
          <img src="itaiko.png" className="pixelated w-96 drag-none" ></img>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Configure and calibrate your custom Taiko drum controller directly
            from your browser.
          </p>
          <div className="flex gap-2 justify-center">
            <Badge variant="secondary">WebSerial</Badge>
            <Badge variant="secondary">Real-time Monitoring</Badge>
            <Badge variant="secondary">No Download Required</Badge>
          </div>
        </div>

        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/configure">Configure Your Drum</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Live Monitor</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time sensor visualization with GPU-accelerated graphs
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Easy Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust thresholds and timing settings with intuitive controls
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <Drum className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Visual Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  See your drum pads light up in real-time as you play
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="px-16 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground w-full">
          <div className="flex items-center gap-2">
            <Usb className="h-4 w-4" />
            <span>Requires Chrome, Edge, Opera or Firefox with WebSerial extension</span>
          </div>
          <div>ITAIKO</div>
        </div>
      </footer>
    </div>
  );
}
