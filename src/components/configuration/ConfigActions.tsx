import { useDevice } from "@/context/DeviceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export function ConfigActions() {
  const { configLoading, resetToDefaults } = useDevice();

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-3 py-4">
        <Button
          variant="secondary"
          onClick={resetToDefaults}
          disabled={configLoading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
