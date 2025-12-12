import { useState, useEffect, useRef, useCallback } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { KeyMappings } from "@/types";
import { hidToKeyName, browserKeyToHid } from "@/lib/hid-keycodes";
import { HelpButton } from "@/components/ui/help-modal";
import { RotateCcw } from "lucide-react";

// Map SVG button IDs to KeyMappings structure
const BUTTON_MAPPINGS: Record<string, { category: keyof KeyMappings; key: string }> = {
  // Action buttons (NESW)
  "North": { category: "controller", key: "north" },
  "East": { category: "controller", key: "east" },
  "South": { category: "controller", key: "south" },
  "West": { category: "controller", key: "west" },

  // D-Pad
  "Up": { category: "controller", key: "up" },
  "Down": { category: "controller", key: "down" },
  "Left": { category: "controller", key: "left" },
  "Right": { category: "controller", key: "right" },

  // Shoulders
  "L--Left-Shoulder-": { category: "controller", key: "l" },
  "R--Right-Shoulder-": { category: "controller", key: "r" },

  // Special buttons
  "Escape": { category: "controller", key: "home" },
  "Tab": { category: "controller", key: "select" },
};

export function InteractiveKeyMapping() {
  const { config, updateKeyMapping, isConnected, resetKeyMappings } = useDevice();
  const keyMappings = config.keyMappings;
  // We use this state only to signal that SVG is injected and ready for manipulation
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Fetch and insert SVG manually to avoid React reconciliation issues
  useEffect(() => {
    if (!svgContainerRef.current) return;

    // If we already have content, don't re-fetch
    if (svgContainerRef.current.querySelector("svg")) {
      setSvgLoaded(true);
      return;
    }

    fetch("/onigiri.svg")
      .then((res) => res.text())
      .then((content) => {
        if (svgContainerRef.current) {
          // Manually inject HTML. React will leave this alone as long as we don't
          // render children in JSX.
          svgContainerRef.current.innerHTML = content;

          // Make SVG responsive
          const svg = svgContainerRef.current.querySelector("svg");
          if (svg) {
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.style.width = "100%";
            svg.style.height = "auto";
            svg.style.maxHeight = "600px"; // Prevent it from becoming too tall
          }

          setSvgLoaded(true);
        }
      })
      .catch(console.error);
  }, []);

  // Handle button click
  const handleButtonClick = useCallback((buttonId: string) => {
    if (!isConnected || !BUTTON_MAPPINGS[buttonId]) return;
    setSelectedButton(buttonId);
    setIsListening(true);
  }, [isConnected]);

  // Attach event listeners to SVG elements
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    // Clean up previous listeners if they exist
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    const clickHandlers: Array<{ element: Element; handler: () => void }> = [];

    Object.keys(BUTTON_MAPPINGS).forEach((buttonId) => {
      const element = svg.querySelector(`[id="${buttonId}"]`);
      if (element) {
        const handler = () => handleButtonClick(buttonId);

        element.addEventListener("click", handler);
        element.setAttribute("style", "cursor: pointer; transition: opacity 0.2s;");

        // Hover effects
        const mouseEnter = () => { (element as SVGElement).style.opacity = "0.8"; };
        const mouseLeave = () => { (element as SVGElement).style.opacity = "1"; };

        element.addEventListener("mouseenter", mouseEnter);
        element.addEventListener("mouseleave", mouseLeave);

        clickHandlers.push({ element, handler });
      }
    });

    // Save cleanup function
    cleanupRef.current = () => {
      clickHandlers.forEach(({ element, handler }) => {
        element.removeEventListener("click", handler);
        // Note: We're not explicitly cleaning up mouseenter/leave here as they are anonymous functions
        // created in the loop. In a perfect world we would, but the DOM node removal handles it mostly.
        // For the 'click' handler we saved the reference.
      });
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [svgLoaded, handleButtonClick]);

  // Handle key press when listening
  useEffect(() => {
    if (!isListening || !selectedButton) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const hidCode = browserKeyToHid(e);
      if (hidCode !== null) {
        const mapping = BUTTON_MAPPINGS[selectedButton];
        if (mapping) {
          updateKeyMapping(mapping.category, mapping.key, hidCode);
        }
        setIsListening(false);
        setSelectedButton(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (svgContainerRef.current && !svgContainerRef.current.contains(e.target as Node)) {
        setIsListening(false);
        setSelectedButton(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isListening, selectedButton, updateKeyMapping]);

  // Helper to get button value
  const getButtonValue = useCallback((buttonId: string): number | null => {
    if (!keyMappings) return null;
    const mapping = BUTTON_MAPPINGS[buttonId];
    if (!mapping) return null;

    const categoryMappings = keyMappings[mapping.category];
    if (!categoryMappings) return null;

    return (categoryMappings as Record<string, number>)[mapping.key] ?? null;
  }, [keyMappings]);

  // Update SVG button colors and LABELS based on state
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    // Clear existing labels
    const existingLabels = svg.querySelectorAll(".key-mapping-label");
    existingLabels.forEach(el => el.remove());

    Object.keys(BUTTON_MAPPINGS).forEach((buttonId) => {
      let element = svg.querySelector(`[id="${buttonId}"]`);
      if (!element) return;

      let fill = "#22c55e"; // Green for mappable buttons
      if (selectedButton === buttonId && isListening) {
        fill = "#3b82f6"; // Blue when listening
      }

      const tagName = element.tagName.toLowerCase();
      const shapeElement = tagName === "g"
        ? element.querySelector("circle, rect, path")
        : element;

      if (shapeElement) {
        (shapeElement as SVGElement).style.fill = fill;
      }

      // --- Add Label ---
      const value = getButtonValue(buttonId);
      const keyName = value !== null ? hidToKeyName(value) : "";

      if (keyName && element instanceof SVGGraphicsElement) {
        try {
          // Get BBox in local element coordinates
          const bbox = element.getBBox();

          // Calculate center in local coordinates
          const centerX = bbox.x + bbox.width / 2;
          const centerY = bbox.y + bbox.height / 2;

          // Convert local center to global SVG coordinates
          // We must transform to screen space then back to SVG root user space
          // to account for viewBox, scaling, and nested transforms correctly.
          const pt = (svg as SVGSVGElement).createSVGPoint();
          pt.x = centerX;
          pt.y = centerY;

          const elemScreenCTM = element.getScreenCTM();
          const svgScreenCTM = (svg as SVGSVGElement).getScreenCTM();

          let globalPt = pt;
          if (elemScreenCTM && svgScreenCTM) {
            globalPt = pt.matrixTransform(elemScreenCTM).matrixTransform(svgScreenCTM.inverse());
          }

          const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textElement.textContent = keyName;
          textElement.setAttribute("x", globalPt.x.toString());
          textElement.setAttribute("y", globalPt.y.toString());
          textElement.setAttribute("text-anchor", "middle");
          textElement.setAttribute("dominant-baseline", "middle");
          textElement.setAttribute("fill", "white");
          textElement.setAttribute("font-size", "24");
          textElement.setAttribute("font-weight", "bold");
          textElement.setAttribute("pointer-events", "none");
          textElement.setAttribute("class", "key-mapping-label");
          textElement.style.textShadow = "0px 1px 2px rgba(0,0,0,0.5)";

          svg.appendChild(textElement);
        } catch (e) {
          console.error("Could not calculate position for label:", buttonId, e);
        }
      }
    });
  }, [svgLoaded, selectedButton, isListening, getButtonValue]); // Added getButtonValue dependency

  if (!keyMappings) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          Key Mappings
          <HelpButton helpKey="key-mappings" />
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetKeyMappings}
          disabled={!isConnected}
          title="Reset key mappings to defaults"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {isListening && selectedButton && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
          <p className="text-sm text-blue-800 text-center font-medium animate-pulse">
            Press any key to assign to {selectedButton.replace(/--/g, " (").replace(/-/g, " ").replace(/  /g, " ")}...
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controller Board</CardTitle>
          <CardDescription>            Click any green button on the board and press a key to assign it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
          </p>

          <div className="flex justify-center w-full">
            {/* Manually managed SVG container */}
            <div
              ref={svgContainerRef}
              className="w-full"
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#22c55e" }} />
              <span>Mappable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white border border-gray-300" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3b82f6" }} />
              <span>Listening...</span>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}