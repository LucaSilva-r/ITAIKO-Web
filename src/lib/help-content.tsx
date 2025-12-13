import { registerHelp } from "@/components/ui/help-modal";
import { LucideAlertTriangle } from "lucide-react";

// Register all help content on module load
export function initializeHelpContent() {
  // Global Settings
  registerHelp("global-settings", {
    title: "Global Settings",
    description: "Settings that affect the overall behavior of the drum.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">Allow Double Inputs</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Enabling this option allows you to hit both pads harder and hit big notes. <br /> Using this functionality requires setting the heavy trigger setting in the pad tresholds
          </p>
        </section>
      </div>
    ),
  });

  // Pad Thresholds
  registerHelp("pad-thresholds", {
    title: "Pad Thresholds",
    description: "Configure the sensitivity and trigger levels for each pad.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">Light Trigger</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            How hard the pad must be hit to register a note. <br /> This is the most important setting to configure.
          </p>
        </section>
        <section>
          <h4 className="font-semibold">Heavy Trigger</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            This field appears only after enabling "Allow Double Inputs in Global Settings"
            <br />
            This treshold is what decides if a hit to a pad bypasses the debounce and let's you hit a Big Note.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h4 className="font-semibold">Cutoff</h4>
          <div className="container border-destructive border-2 p-4 bg-destructive/5  text-destructive rounded-xl">
            <LucideAlertTriangle className="inline" />
            Verify you actually have this issue in the live monitor before setting this slider to a value lower than 4095.
          </div>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            This setting is used in the situation where hitting a pad very hard causes a spike in another unrelated pad.
            <br />
            In some boards we found out some current can leak into the analog input of another pin causing missreadings.
            <br />
            <br/>
            This cutoff slider makes it so any hit that goes over this treshold is istantly ignored
          </p>
        </section>
      </div>
    ),
  });

  // Timing Settings
  registerHelp("timing-settings", {
    title: "Timing Settings",
    description: "Configure timing-related parameters for hit detection.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">Debounce Time</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
        <section>
          <h4 className="font-semibold">Sample Count</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
      </div>
    ),
  });

  // ADC Channel Settings
  registerHelp("adc-channels", {
    title: "ADC Channel Mapping",
    description: "Map physical ADC channels to drum pads.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">What are ADC Channels?</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
        <section>
          <h4 className="font-semibold">Channel Assignment</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
      </div>
    ),
  });

  // Key Mapping Settings
  registerHelp("key-mappings", {
    title: "Key Mappings",
    description: "Configure which keys are sent when pads are hit.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">Gamepad Buttons</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
        <section>
          <h4 className="font-semibold">Keyboard Keys</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
      </div>
    ),
  });

  // Boot Screen
  registerHelp("boot-screen", {
    title: "Boot Screen",
    description: "Customize the startup splash screen of your controller.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">Image Requirements</h4>
          <p className="text-muted-foreground">
            The image will be converted to a 128x64 pixel 1-bit monochrome (black and white) bitmap.
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Supported formats: PNG, JPG, BMP</li>
              <li>Optimal aspect ratio: 2:1</li>
              <li>Colors: Will be dithered/thresholded to black and white</li>
            </ul>
          </p>
        </section>
        <section>
          <h4 className="font-semibold">How to Use</h4>
          <p className="text-muted-foreground">
            1. Select an image file.<br />
            2. Preview the monochrome conversion.<br />
            3. Click "Upload to Device" to flash the new image.<br />
            4. The new splash screen will appear next time you plug in the device.
          </p>
        </section>
        <section>
          <h4 className="font-semibold">Restoring Default</h4>
          <p className="text-muted-foreground">
            Click the trash icon to clear the custom image and restore the original ITAIKO logo.
          </p>
        </section>
      </div>
    ),
  });

  // Live Monitor
  registerHelp("live-monitor", {
    title: "Live Monitor",
    description: "Real-time visualization of pad inputs.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">Graph Display</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
        <section>
          <h4 className="font-semibold">Trigger Indicators</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
      </div>
    ),
  });

  // Visual Drum
  registerHelp("visual-drum", {
    title: "Visual Drum",
    description: "Visual representation of drum hits.",
    content: (
      <div className="space-y-4">
        <section>
          <h4 className="font-semibold">How to Use</h4>
          <p className="text-muted-foreground">
            {/* TODO: Add documentation */}
            Documentation coming soon...
          </p>
        </section>
      </div>
    ),
  });
}
