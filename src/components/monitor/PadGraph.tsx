import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { WebglPlot, WebglLine, ColorRGBA } from "webgl-plot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { PadName, PadGraphPoint } from "@/types";
import { PAD_LABELS, PAD_COLORS } from "@/types";

interface PadGraphProps {
  pad: PadName;
  data: PadGraphPoint[];
  lightThreshold: number;
  heavyThreshold: number;
  cutoffThreshold: number;
  showHeavy: boolean;
  numPoints?: number;
}

function hexToRgba(hex: string, alpha: number = 1): ColorRGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return new ColorRGBA(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      alpha
    );
  }
  return new ColorRGBA(1, 1, 1, alpha);
}

// Zone detection thresholds (percentage of canvas dimensions)
const Y_AXIS_ZONE = 0.12; // Left 12% for Y-axis zoom
const X_AXIS_ZONE = 0.15; // Bottom 15% for X-axis zoom

// Generate nice tick values for an axis
function generateTicks(min: number, max: number, maxTicks: number): number[] {
  const range = max - min;
  if (range <= 0) return [min];

  // Find a nice step size
  const roughStep = range / maxTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const ticks: number[] = [];
  const start = Math.ceil(min / niceStep) * niceStep;
  for (let tick = start; tick <= max; tick += niceStep) {
    ticks.push(Math.round(tick * 1000) / 1000); // Avoid floating point issues
  }

  return ticks;
}

export function PadGraph({
  pad,
  data,
  lightThreshold,
  heavyThreshold,
  cutoffThreshold,
  showHeavy,
  numPoints = 500,
}: PadGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wglpRef = useRef<WebglPlot | null>(null);
  const rawLineRef = useRef<WebglLine | null>(null);
  const deltaLineRef = useRef<WebglLine | null>(null);

  // Zoom state - use state to trigger re-renders for axis labels
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Pan state
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  const maxADC = 4095;

  // Calculate visible ranges based on zoom
  const visibleRange = useMemo(() => {
    // WebGL coords go from -1 to 1
    // Screen left edge in WebGL coords: (-1 - offset.x) / scale.x
    // Screen right edge in WebGL coords: (1 - offset.x) / scale.x
    const webglLeft = (-1 - offset.x) / scale.x;
    const webglRight = (1 - offset.x) / scale.x;
    const webglBottom = (-1 - offset.y) / scale.y;
    const webglTop = (1 - offset.y) / scale.y;

    // Convert WebGL coords to data coords (no clamping - allow values beyond data range when zoomed out)
    // X: webgl -1 to 1 maps to samples 0 to numPoints
    // Y: webgl -1 to 1 maps to ADC 0 to maxADC
    const xMin = ((webglLeft + 1) / 2) * numPoints;
    const xMax = ((webglRight + 1) / 2) * numPoints;
    const yMin = ((webglBottom + 1) / 2) * maxADC;
    const yMax = ((webglTop + 1) / 2) * maxADC;

    return { xMin, xMax, yMin, yMax };
  }, [scale, offset, numPoints, maxADC]);

  // Generate axis ticks
  const yTicks = useMemo(() => {
    return generateTicks(visibleRange.yMin, visibleRange.yMax, 5);
  }, [visibleRange.yMin, visibleRange.yMax]);

  const xTicks = useMemo(() => {
    return generateTicks(visibleRange.xMin, visibleRange.xMax, 5);
  }, [visibleRange.xMin, visibleRange.xMax]);

  // Convert data value to screen percentage
  const dataToScreenY = useCallback(
    (value: number): number => {
      // Convert ADC value to WebGL coords (-1 to 1)
      const webglY = (value / maxADC) * 2 - 1;
      // Apply scale and offset
      const screenY = webglY * scale.y + offset.y;
      // Convert to percentage (0-100, bottom to top)
      return ((screenY + 1) / 2) * 100;
    },
    [scale.y, offset.y, maxADC]
  );

  const dataToScreenX = useCallback(
    (value: number): number => {
      // Convert sample index to WebGL coords (-1 to 1)
      const webglX = (value / numPoints) * 2 - 1;
      // Apply scale and offset
      const screenX = webglX * scale.x + offset.x;
      // Convert to percentage (0-100, left to right)
      return ((screenX + 1) / 2) * 100;
    },
    [scale.x, offset.x, numPoints]
  );

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    const wglp = wglpRef.current;
    if (!wglp) return;

    wglp.gScaleX = 1;
    wglp.gScaleY = 1;
    wglp.gOffsetX = 0;
    wglp.gOffsetY = 0;
    setScale({ x: 1, y: 1 });
    setOffset({ x: 0, y: 0 });
    setIsZoomed(false);
    wglp.update();
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const wglp = wglpRef.current;
    const container = containerRef.current;
    if (!wglp || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const relX = x / rect.width;
    const relY = y / rect.height;

    // Determine zoom direction (scroll up = zoom in)
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    // Determine which axis to zoom based on cursor position
    const inYAxisZone = relX < Y_AXIS_ZONE;
    const inXAxisZone = relY > (1 - X_AXIS_ZONE);

    if (inYAxisZone && !inXAxisZone) {
      // Zoom Y only (left edge)
      const oldScale = wglp.gScaleY;
      const newScale = oldScale * zoomFactor;

      // Zoom towards the cursor position
      const cursorY = (1 - relY) * 2 - 1;
      const worldY = (cursorY - wglp.gOffsetY) / oldScale;

      wglp.gScaleY = newScale;
      wglp.gOffsetY = cursorY - worldY * newScale;
    } else if (inXAxisZone && !inYAxisZone) {
      // Zoom X only (bottom edge)
      const oldScale = wglp.gScaleX;
      const newScale = oldScale * zoomFactor;

      // Zoom towards the cursor position
      const cursorX = relX * 2 - 1;
      const worldX = (cursorX - wglp.gOffsetX) / oldScale;

      wglp.gScaleX = newScale;
      wglp.gOffsetX = cursorX - worldX * newScale;
    } else {
      // Zoom both (main area)
      const oldScaleX = wglp.gScaleX;
      const oldScaleY = wglp.gScaleY;
      const newScaleX = oldScaleX * zoomFactor;
      const newScaleY = oldScaleY * zoomFactor;

      // Zoom towards cursor
      const cursorX = relX * 2 - 1;
      const cursorY = (1 - relY) * 2 - 1;
      const worldX = (cursorX - wglp.gOffsetX) / oldScaleX;
      const worldY = (cursorY - wglp.gOffsetY) / oldScaleY;

      wglp.gScaleX = newScaleX;
      wglp.gScaleY = newScaleY;
      wglp.gOffsetX = cursorX - worldX * newScaleX;
      wglp.gOffsetY = cursorY - worldY * newScaleY;
    }

    // Update state to trigger re-render for axis labels
    setScale({ x: wglp.gScaleX, y: wglp.gScaleY });
    setOffset({ x: wglp.gOffsetX, y: wglp.gOffsetY });

    // Check if zoomed from default
    const isNowZoomed =
      Math.abs(wglp.gScaleX - 1) > 0.01 ||
      Math.abs(wglp.gScaleY - 1) > 0.01 ||
      Math.abs(wglp.gOffsetX) > 0.01 ||
      Math.abs(wglp.gOffsetY) > 0.01;

    setIsZoomed(isNowZoomed);
    wglp.update();
  }, []);

  // Handle pan start (right-click or middle-click)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Right-click (button 2) or middle-click (button 1)
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  // Handle pan move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanningRef.current) return;

    const wglp = wglpRef.current;
    const container = containerRef.current;
    if (!wglp || !container) return;

    const rect = container.getBoundingClientRect();
    const dx = (e.clientX - lastPanPosRef.current.x) / rect.width * 2;
    const dy = -(e.clientY - lastPanPosRef.current.y) / rect.height * 2;

    wglp.gOffsetX += dx;
    wglp.gOffsetY += dy;

    lastPanPosRef.current = { x: e.clientX, y: e.clientY };

    // Update state to trigger re-render for axis labels
    setScale({ x: wglp.gScaleX, y: wglp.gScaleY });
    setOffset({ x: wglp.gOffsetX, y: wglp.gOffsetY });

    // Check if zoomed from default
    const isNowZoomed =
      Math.abs(wglp.gScaleX - 1) > 0.01 ||
      Math.abs(wglp.gScaleY - 1) > 0.01 ||
      Math.abs(wglp.gOffsetX) > 0.01 ||
      Math.abs(wglp.gOffsetY) > 0.01;

    setIsZoomed(isNowZoomed);
    wglp.update();
  }, []);

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  // Initialize WebGL plot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    // Create WebGL plot
    const wglp = new WebglPlot(canvas);
    wglpRef.current = wglp;

    // Create raw ADC line (main color)
    const rawLine = new WebglLine(hexToRgba(PAD_COLORS[pad], 1), numPoints);
    rawLine.arrangeX();
    wglp.addLine(rawLine);
    rawLineRef.current = rawLine;

    // Create delta line (lighter/dotted effect via lower opacity)
    const deltaLine = new WebglLine(hexToRgba(PAD_COLORS[pad], 0.5), numPoints);
    deltaLine.arrangeX();
    wglp.addLine(deltaLine);
    deltaLineRef.current = deltaLine;

    return () => {
      wglpRef.current = null;
      rawLineRef.current = null;
      deltaLineRef.current = null;
    };
  }, [pad, numPoints]);

  // Add wheel and pan event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("contextmenu", handleContextMenu);
    // Add mousemove and mouseup to window to handle drag outside container
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu]);

  // Update data
  useEffect(() => {
    const rawLine = rawLineRef.current;
    const deltaLine = deltaLineRef.current;
    const wglp = wglpRef.current;

    if (!rawLine || !deltaLine || !wglp) return;

    // Fill with data or zeros
    for (let i = 0; i < numPoints; i++) {
      const dataIndex = data.length - numPoints + i;
      if (dataIndex >= 0 && dataIndex < data.length) {
        const point = data[dataIndex];
        // Normalize to -1 to 1 range
        rawLine.setY(i, (point.raw / maxADC) * 2 - 1);
        deltaLine.setY(i, (point.delta / maxADC) * 2 - 1);
      } else {
        rawLine.setY(i, -1);
        deltaLine.setY(i, -1);
      }
    }

    wglp.update();
  }, [data]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate threshold line positions
  const lightPos = dataToScreenY(lightThreshold);
  const heavyPos = dataToScreenY(heavyThreshold);
  const cutoffPos = dataToScreenY(cutoffThreshold);

  return (
    <Card className="overflow-hidden relative gap-0 p-0">
      <CardHeader className="py-2! border-b-accent border-b">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PAD_COLORS[pad] }}
            />
            {PAD_LABELS[pad]}
          </div>
          {isZoomed && (
            <Button
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={resetZoom}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden h-64">
        <div className="flex h-full">
          {/* Y-Axis Column */}
          <div className="flex flex-col shrink-0" style={{ width: "2.5rem" }}>
            {/* Y-Axis Labels - flex-1 to match plot height */}
            <div className="relative bg-black flex-1">
              {yTicks.map((tick) => {
                const pos = dataToScreenY(tick);
                if (pos < 0 || pos > 100) return null;
                return (
                  <div
                    key={tick}
                    className="absolute right-1 text-[9px] text-white/60 -translate-y-1/2"
                    style={{ bottom: `${pos}%` }}
                  >
                    {Math.round(tick)}
                  </div>
                );
              })}
            </div>
            {/* Spacer to match X-axis height */}
            <div className="bg-black" style={{ height: "1.25rem" }} />
          </div>

          {/* Main Plot Area */}
          <div className="flex-1 flex flex-col">
            <div
              ref={containerRef}
              className="relative flex-1 bg-black cursor-crosshair"
            >
              {/* Zoom zone indicators (subtle) */}
              {/* <div
                className="absolute left-0 top-0 bottom-0 bg-white/5 pointer-events-none"
                style={{ width: `${Y_AXIS_ZONE * 100}%` }}
              />
              <div
                className="absolute left-0 right-0 bottom-0 bg-white/5 pointer-events-none"
                style={{ height: `${X_AXIS_ZONE * 100}%` }}
              /> */}

              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Horizontal grid lines (Y-axis ticks) */}
                {yTicks.map((tick) => {
                  const pos = dataToScreenY(tick);
                  if (pos < 0 || pos > 100) return null;
                  return (
                    <div
                      key={`y-grid-${tick}`}
                      className="absolute w-full border-t border-white/20"
                      style={{ bottom: `${pos}%` }}
                    />
                  );
                })}
                {/* Vertical grid lines (X-axis ticks) */}
                {xTicks.map((tick) => {
                  const pos = dataToScreenX(tick);
                  if (pos < 0 || pos > 100) return null;
                  return (
                    <div
                      key={`x-grid-${tick}`}
                      className="absolute h-full border-l border-white/20"
                      style={{ left: `${pos}%` }}
                    />
                  );
                })}
              </div>

              {/* WebGL Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />

              {/* Threshold reference lines (overlaid) - only show if in view */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Light threshold (yellow) */}
                {lightPos >= 0 && lightPos <= 100 && (
                  <div
                    className="absolute w-full border-t border-dashed border-yellow-500"
                    style={{ bottom: `${lightPos}%` }}
                  />
                )}
                {/* Heavy threshold (orange) - only if double mode */}
                {showHeavy && heavyPos >= 0 && heavyPos <= 100 && (
                  <div
                    className="absolute w-full border-t border-dashed border-orange-500"
                    style={{ bottom: `${heavyPos}%` }}
                  />
                )}
                {/* Cutoff threshold (red) */}
                {cutoffPos >= 0 && cutoffPos <= 100 && (
                  <div
                    className="absolute w-full border-t border-dashed border-red-500"
                    style={{ bottom: `${cutoffPos}%` }}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="absolute top-1 right-1 text-[10px] text-white/70 space-y-0.5">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-0.5 bg-yellow-500" />
                  <span>Light</span>
                </div>
                {showHeavy && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-orange-500" />
                    <span>Heavy</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-2 h-0.5 bg-red-500" />
                  <span>Cutoff</span>
                </div>
              </div>

              {/* Zoom/pan hint */}
              {!isZoomed && (
                <div className="absolute bottom-1 left-1 text-[9px] text-white/40">
                  Scroll to zoom · Right-drag to pan
                </div>
              )}
            </div>

            {/* X-Axis Labels */}
            <div
              className="relative bg-black"
              style={{ height: "1.25rem", marginLeft: 0 }}
            >
              {xTicks.map((tick) => {
                const pos = dataToScreenX(tick);
                if (pos < 0 || pos > 100) return null;
                return (
                  <div
                    key={tick}
                    className="absolute top-0 text-[9px] text-white/60 -translate-x-1/2"
                    style={{ left: `${pos}%` }}
                  >
                    {Math.round(tick)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
