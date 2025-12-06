import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAD_LABELS, PAD_COLORS, PAD_NAMES } from "@/types";

export function VisualDrumTab() {
  const { latestFrame, isStreaming } = useDevice();

  // Dim colors for inactive state
  const getDimColor = (color: string) => {
    // Parse hex and reduce brightness
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${Math.floor(r * 0.3)}, ${Math.floor(g * 0.3)}, ${Math.floor(b * 0.3)})`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visual Drum</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Placeholder Drum Visualization */}
          <div className="flex flex-col items-center gap-6">
            {/* Drum SVG Placeholder */}
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Outer rim (Ka pads) */}
                {/* Ka Left - left half of outer ring */}
                <path
                  d="M 100 10 A 90 90 0 0 0 100 190 L 100 170 A 70 70 0 0 1 100 30 Z"
                  fill={
                    latestFrame?.pads.kaLeft.triggered
                      ? PAD_COLORS.kaLeft
                      : getDimColor(PAD_COLORS.kaLeft)
                  }
                  className="transition-colors duration-75"
                />
                {/* Ka Right - right half of outer ring */}
                <path
                  d="M 100 10 A 90 90 0 0 1 100 190 L 100 170 A 70 70 0 0 0 100 30 Z"
                  fill={
                    latestFrame?.pads.kaRight.triggered
                      ? PAD_COLORS.kaRight
                      : getDimColor(PAD_COLORS.kaRight)
                  }
                  className="transition-colors duration-75"
                />

                {/* Inner face (Don pads) */}
                {/* Don Left - left half of inner circle */}
                <path
                  d="M 100 30 A 70 70 0 0 0 100 170 L 100 100 Z"
                  fill={
                    latestFrame?.pads.donLeft.triggered
                      ? PAD_COLORS.donLeft
                      : getDimColor(PAD_COLORS.donLeft)
                  }
                  className="transition-colors duration-75"
                />
                {/* Don Right - right half of inner circle */}
                <path
                  d="M 100 30 A 70 70 0 0 1 100 170 L 100 100 Z"
                  fill={
                    latestFrame?.pads.donRight.triggered
                      ? PAD_COLORS.donRight
                      : getDimColor(PAD_COLORS.donRight)
                  }
                  className="transition-colors duration-75"
                />

                {/* Center dividing lines */}
                <line
                  x1="100"
                  y1="10"
                  x2="100"
                  y2="190"
                  stroke="black"
                  strokeWidth="2"
                />
              </svg>

              {/* Labels */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full pr-2 text-xs text-muted-foreground">
                Ka L
              </div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-full pl-2 text-xs text-muted-foreground">
                Ka R
              </div>
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 text-xs text-white font-medium">
                Don L
              </div>
              <div className="absolute top-1/2 right-1/4 -translate-y-1/2 text-xs text-white font-medium">
                Don R
              </div>
            </div>

            {/* Pad Status Indicators */}
            <div className="grid grid-cols-4 gap-4">
              {PAD_NAMES.map((pad) => {
                const isActive = latestFrame?.pads[pad].triggered ?? false;
                const rawValue = latestFrame?.pads[pad].raw ?? 0;

                return (
                  <div
                    key={pad}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-4 h-4 rounded-full transition-colors duration-75"
                      style={{
                        backgroundColor: isActive
                          ? PAD_COLORS[pad]
                          : getDimColor(PAD_COLORS[pad]),
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {PAD_LABELS[pad]}
                    </span>
                    <span className="text-xs font-mono">{rawValue}</span>
                  </div>
                );
              })}
            </div>

            {/* Status Message */}
            {!isStreaming && (
              <p className="text-sm text-muted-foreground">
                Start streaming in Live Monitor to see pad activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder note */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Custom drum graphics will replace this placeholder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
