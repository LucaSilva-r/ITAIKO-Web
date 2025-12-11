import { useEffect, useRef } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAD_COLORS } from "@/types";

export function VisualDrumTab() {
  const { triggers, isConnected, isReady, startStreaming } = useDevice();

  // Use ref to always have latest function without causing effect re-runs
  const startStreamingRef = useRef(startStreaming);
  useEffect(() => {
    startStreamingRef.current = startStreaming;
  });

  // Start streaming when device is ready (after config read)
  useEffect(() => {
    if (isReady) {
      startStreamingRef.current();
    }
  }, [isReady]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visual Drum</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {/* Drum Container */}
            <div className="relative w-64 h-64">
              {/* Background Image */}
              <img
                src="/visual_drum.png"
                alt="Visual Drum Background"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* Drum SVG Overlay */}
              <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                {/* Ka Left - left half of outer ring */}
                <path
                  d="M 100 10 A 90 90 0 0 0 100 190 L 100 170 A 70 70 0 0 1 100 30 Z"
                  fill={triggers.kaLeft ? PAD_COLORS.kaLeft : "transparent"}
                />
                {/* Ka Right - right half of outer ring */}
                <path
                  d="M 100 10 A 90 90 0 0 1 100 190 L 100 170 A 70 70 0 0 0 100 30 Z"
                  fill={triggers.kaRight ? PAD_COLORS.kaRight : "transparent"}
                />
                {/* Don Left - left half of inner circle */}
                <path
                  d="M 100 30 A 70 70 0 0 0 100 170 L 100 100 Z"
                  fill={triggers.donLeft ? PAD_COLORS.donLeft : "transparent"}
                />
                {/* Don Right - right half of inner circle */}
                <path
                  d="M 100 30 A 70 70 0 0 1 100 170 L 100 100 Z"
                  fill={triggers.donRight ? PAD_COLORS.donRight : "transparent"}
                />
              </svg>

              {/* Labels */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full pr-2 text-xs text-muted-foreground">
                Ka L
              </div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-full pl-2 text-xs text-muted-foreground">
                Ka R
              </div>
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 text-xs text-white font-medium drop-shadow-md">
                Don L
              </div>
              <div className="absolute top-1/2 right-1/4 -translate-y-1/2 text-xs text-white font-medium drop-shadow-md">
                Don R
              </div>
            </div>

            {/* Status Message */}
            {!isConnected && (
              <p className="text-sm text-muted-foreground">
                Connect the drum to see pad activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}