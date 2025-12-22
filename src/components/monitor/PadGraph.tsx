import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { WebglPlot, WebglLine, ColorRGBA } from "webgl-plot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { PadName, PadBuffer } from "@/types";
import { PAD_LABELS, PAD_COLORS } from "@/types";

interface PadGraphProps {
  pad: PadName;
  buffer: PadBuffer;          // Zero-allocation Float32Array buffer
  lightThreshold: number;
  heavyThreshold: number;
  cutoffThreshold: number;
  showHeavy: boolean;
  numPoints?: number;         // History buffer size (data points stored)
  displayPoints?: number;     // WebGL vertex count (constant for performance)
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

// Zone detection thresholds
const Y_AXIS_ZONE = 0.12;
const X_AXIS_ZONE = 0.15;

// Generate nice tick values
function generateTicks(min: number, max: number, maxTicks: number): number[] {
  const range = max - min;
  if (range <= 0) return [min];
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
    ticks.push(Math.round(tick * 1000) / 1000);
  }
  return ticks;
}

// Helper to read from circular buffer at logical index
function readFromCircularBuffer(
  buffer: Float32Array,
  head: number,
  count: number,
  capacity: number,
  logicalIndex: number
): number {
  if (logicalIndex < 0 || logicalIndex >= count) return 0;
  // Convert logical index (0 = oldest) to physical index
  const startIdx = (head - count + capacity) % capacity;
  const physicalIdx = (startIdx + logicalIndex) % capacity;
  return buffer[physicalIdx];
}

export function PadGraph({
  pad,
  buffer,
  lightThreshold,
  heavyThreshold,
  cutoffThreshold,
  showHeavy,
  numPoints = 500,
  displayPoints = 500,
}: PadGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wglpRef = useRef<WebglPlot | null>(null);
  const deltaLineRef = useRef<WebglLine | null>(null);

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Pan state
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  const maxADC = 4095;

  // Calculate visible ranges
  const visibleRange = useMemo(() => {
    const webglLeft = (-1 - offset.x) / scale.x;
    const webglRight = (1 - offset.x) / scale.x;
    const webglBottom = (-1 - offset.y) / scale.y;
    const webglTop = (1 - offset.y) / scale.y;

    const xMin = ((webglLeft + 1) / 2) * numPoints;
    const xMax = ((webglRight + 1) / 2) * numPoints;
    const yMin = ((webglBottom + 1) / 2) * maxADC;
    const yMax = ((webglTop + 1) / 2) * maxADC;

    return { xMin, xMax, yMin, yMax };
  }, [scale, offset, numPoints, maxADC]);

  const yTicks = useMemo(() => {
    return generateTicks(visibleRange.yMin, visibleRange.yMax, 5);
  }, [visibleRange.yMin, visibleRange.yMax]);

  const xTicks = useMemo(() => {
    return generateTicks(visibleRange.xMin, visibleRange.xMax, 5);
  }, [visibleRange.xMin, visibleRange.xMax]);

  const dataToScreenY = useCallback(
    (value: number): number => {
      const webglY = (value / maxADC) * 2 - 1;
      const screenY = webglY * scale.y + offset.y;
      return ((screenY + 1) / 2) * 100;
    },
    [scale.y, offset.y, maxADC]
  );

  const dataToScreenX = useCallback(
    (value: number): number => {
      const webglX = (value / numPoints) * 2 - 1;
      const screenX = webglX * scale.x + offset.x;
      return ((screenX + 1) / 2) * 100;
    },
    [scale.x, offset.x, numPoints]
  );

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

  const MIN_SCALE = 0.5;
  const MAX_SCALE_Y = 10;
  const maxScaleX = numPoints / displayPoints;

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
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const inYAxisZone = relX < Y_AXIS_ZONE;
    const inXAxisZone = relY > (1 - X_AXIS_ZONE);

    if (inYAxisZone && !inXAxisZone) {
      const oldScale = wglp.gScaleY;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE_Y, oldScale * zoomFactor));
      const cursorY = (1 - relY) * 2 - 1;
      const worldY = (cursorY - wglp.gOffsetY) / oldScale;
      wglp.gScaleY = newScale;
      wglp.gOffsetY = cursorY - worldY * newScale;
    } else if (inXAxisZone && !inYAxisZone) {
      const oldScale = wglp.gScaleX;
      const newScale = Math.max(MIN_SCALE, Math.min(maxScaleX, oldScale * zoomFactor));
      const cursorX = relX * 2 - 1;
      const worldX = (cursorX - wglp.gOffsetX) / oldScale;
      wglp.gScaleX = newScale;
      wglp.gOffsetX = cursorX - worldX * newScale;
    } else {
      const oldScaleX = wglp.gScaleX;
      const oldScaleY = wglp.gScaleY;
      const newScaleX = Math.max(MIN_SCALE, Math.min(maxScaleX, oldScaleX * zoomFactor));
      const newScaleY = Math.max(MIN_SCALE, Math.min(MAX_SCALE_Y, oldScaleY * zoomFactor));
      const cursorX = relX * 2 - 1;
      const cursorY = (1 - relY) * 2 - 1;
      const worldX = (cursorX - wglp.gOffsetX) / oldScaleX;
      const worldY = (cursorY - wglp.gOffsetY) / oldScaleY;
      wglp.gScaleX = newScaleX;
      wglp.gScaleY = newScaleY;
      wglp.gOffsetX = cursorX - worldX * newScaleX;
      wglp.gOffsetY = cursorY - worldY * newScaleY;
    }

    setScale({ x: wglp.gScaleX, y: wglp.gScaleY });
    setOffset({ x: wglp.gOffsetX, y: wglp.gOffsetY });

    const isNowZoomed = Math.abs(wglp.gScaleX - 1) > 0.01 || Math.abs(wglp.gScaleY - 1) > 0.01 || Math.abs(wglp.gOffsetX) > 0.01 || Math.abs(wglp.gOffsetY) > 0.01;
    setIsZoomed(isNowZoomed);
    wglp.update();
  }, [maxScaleX]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

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

    setScale({ x: wglp.gScaleX, y: wglp.gScaleY });
    setOffset({ x: wglp.gOffsetX, y: wglp.gOffsetY });

    const isNowZoomed = Math.abs(wglp.gScaleX - 1) > 0.01 || Math.abs(wglp.gScaleY - 1) > 0.01 || Math.abs(wglp.gOffsetX) > 0.01 || Math.abs(wglp.gOffsetY) > 0.01;
    setIsZoomed(isNowZoomed);
    wglp.update();
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  // Initialize WebGL plot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const wglp = new WebglPlot(canvas);
    wglpRef.current = wglp;

    const deltaLine = new WebglLine(hexToRgba(PAD_COLORS[pad], 1), displayPoints);
    wglp.addLine(deltaLine);
    deltaLineRef.current = deltaLine;

    return () => {
      wglp.removeAllLines();
      wglpRef.current = null;
      deltaLineRef.current = null;
    };
  }, [pad, displayPoints]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("contextmenu", handleContextMenu);
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

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      wglpRef.current?.update();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Store visibleRange in ref for animation loop (avoid stale closure)
  const visibleRangeRef = useRef(visibleRange);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

  // SELF-DRIVING RENDER LOOP: Uses requestAnimationFrame instead of React state
  useEffect(() => {
    let animationId: number;

    const renderFrame = () => {
      const deltaLine = deltaLineRef.current;
      const wglp = wglpRef.current;

      if (!deltaLine || !wglp || !buffer) {
        animationId = requestAnimationFrame(renderFrame);
        return;
      }

      const { delta, head, count, capacity } = buffer;
      const currentVisibleRange = visibleRangeRef.current;

      // Calculate visible range in data space
      const dataOffset = Math.max(0, count - numPoints);
      const viewStart = currentVisibleRange.xMin + dataOffset;
      const viewEnd = currentVisibleRange.xMax + dataOffset;

      // Clamp to valid data range
      const clampedStart = Math.max(0, Math.floor(viewStart));
      const clampedEnd = Math.min(count, Math.ceil(viewEnd));
      const sourceCount = clampedEnd - clampedStart;

      // Safety check - clear lines if no data
      if (sourceCount <= 0 || displayPoints <= 0 || count === 0) {
        for (let i = 0; i < displayPoints; i++) {
          deltaLine.setX(i, -2);
        }
        wglp.update();
        animationId = requestAnimationFrame(renderFrame);
        return;
      }

      const step = sourceCount / displayPoints;

      // Direct write to WebGL buffer - ZERO allocation in this loop
      for (let i = 0; i < displayPoints; i++) {
        const srcStart = Math.floor(clampedStart + i * step);
        const srcEnd = Math.min(Math.floor(clampedStart + (i + 1) * step), clampedEnd);

        // Downsample by MAX (peak detection)
        let maxDelta = 0;
        let sampleCount = 0;
        for (let j = srcStart; j < srcEnd; j++) {
          const val = readFromCircularBuffer(delta, head, count, capacity, j);
          if (val > maxDelta) maxDelta = val;
          sampleCount++;
        }

        if (sampleCount > 0) {
          const dataX = clampedStart + (i + 0.5) * step;

          // Transform to WebGL coordinates (-1 to 1)
          const relativeX = dataX - dataOffset;
          const webglX = (relativeX / numPoints) * 2 - 1;
          const webglYDelta = (maxDelta / maxADC) * 2 - 1;

          deltaLine.setX(i, webglX);
          deltaLine.setY(i, webglYDelta);
        } else {
          deltaLine.setX(i, -2);
        }
      }

      wglp.update();
      animationId = requestAnimationFrame(renderFrame);
    };

    // Start the animation loop
    animationId = requestAnimationFrame(renderFrame);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [buffer, displayPoints, numPoints, maxADC]);

  // Calculate threshold line positions
  const lightPos = dataToScreenY(lightThreshold);
  const heavyPos = dataToScreenY(heavyThreshold);
  const cutoffPos = dataToScreenY(cutoffThreshold);

  return (
    <Card className="overflow-hidden relative gap-0 p-0">
      <CardHeader className="py-4! border-b-accent border-b items-center align-middle flex">
        <CardTitle className="flex items-center justify-between text-sm w-full">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PAD_COLORS[pad] }}
            />
            {PAD_LABELS[pad]}
          </div>
          {isZoomed && (
            <Button size="sm" className="h-6 px-2 text-xs" onClick={resetZoom}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden h-64">
        <div className="flex h-full">
          {/* Y-Axis */}
          <div className="flex flex-col shrink-0" style={{ width: "2.5rem" }}>
            <div className="relative bg-black flex-1">
              {yTicks.map((tick) => {
                const pos = dataToScreenY(tick);
                if (pos < 0 || pos > 100) return null;
                return (
                  <div key={tick} className="absolute right-1 text-[9px] text-white/60 -translate-y-1/2" style={{ bottom: `${pos}%` }}>
                    {Math.round(tick)}
                  </div>
                );
              })}
            </div>
            <div className="bg-black" style={{ height: "1.25rem" }} />
          </div>

          {/* Main Plot */}
          <div className="flex-1 flex flex-col">
            <div ref={containerRef} className="relative flex-1 bg-black cursor-crosshair">
              {/* Grid */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {yTicks.map((tick) => (
                  <div key={`y-grid-${tick}`} className="absolute w-full border-t border-white/20" style={{ bottom: `${dataToScreenY(tick)}%` }} />
                ))}
                {xTicks.map((tick) => (
                  <div key={`x-grid-${tick}`} className="absolute h-full border-l border-white/20" style={{ left: `${dataToScreenX(tick)}%` }} />
                ))}
              </div>

              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              {/* Thresholds */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {lightPos >= 0 && lightPos <= 100 && <div className="absolute w-full border-t border-dashed border-yellow-500" style={{ bottom: `${lightPos}%` }} />}
                {showHeavy && heavyPos >= 0 && heavyPos <= 100 && <div className="absolute w-full border-t border-dashed border-orange-500" style={{ bottom: `${heavyPos}%` }} />}
                {cutoffPos >= 0 && cutoffPos <= 100 && <div className="absolute w-full border-t border-dashed border-red-500" style={{ bottom: `${cutoffPos}%` }} />}
              </div>
            </div>

            {/* X-Axis */}
            <div className="relative bg-black" style={{ height: "1.25rem" }}>
              {xTicks.map((tick) => {
                const pos = dataToScreenX(tick);
                if (pos < 0 || pos > 100) return null;
                return (
                  <div key={tick} className="absolute top-0 text-[9px] text-white/60 -translate-x-1/2" style={{ left: `${pos}%` }}>
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
