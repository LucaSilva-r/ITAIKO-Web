# ITAIKO Web Configurator

## Project Overview
ITAIKO Web Configurator is a React-based web application designed to configure and monitor the "ITAIKO" custom Taiko drum controller. It utilizes the Web Serial API to communicate directly with the controller firmware, allowing users to adjust sensitivity thresholds, key mappings, and debounce settings, as well as view real-time sensor data.

## Tech Stack
*   **Framework:** React 19 + TypeScript
*   **Build Tool:** Vite 7
*   **Styling:** Tailwind CSS v4
*   **UI Components:** Radix UI primitives (shadcn/ui style), Lucide React icons
*   **Communication:** Web Serial API
*   **Visualization:** `webgl-plot` for real-time sensor graphs, `@lottiefiles/dotlottie-react` for animations
*   **State Management:** React Context (`DeviceContext`)

## Key Features
*   **Device Configuration:** Read and write 46+ configuration parameters (thresholds, timings, key mappings).
*   **Live Monitor:** Real-time visualization of sensor data (100Hz streaming) to aid in sensitivity tuning.
*   **Firmware Update:** Mechanism to update the controller's firmware via the web interface.
*   **PWA Support:** Configured as a Progressive Web App for installation and offline capability.

## Directory Structure
*   `src/components/` - React components organized by feature (configuration, monitor, connection, ui).
*   `src/context/` - Global state management, primarily `DeviceContext.tsx` for device connection and settings state.
*   `src/hooks/` - Custom hooks for serial communication (`useWebSerial.ts`), device config (`useDeviceConfig.ts`), etc.
*   `src/lib/` - Utility functions and protocol definitions.
    *   `serial-protocol.ts`: Implements the communication protocol defined in `SERIAL_CONFIG.md`.
    *   `hid-keycodes.ts`: Mappings for HID keycodes used in controller configuration.
*   `src/pages/` - Main application pages (`LandingPage.tsx`, `ConfigurePage.tsx`).
*   `public/firmware/` - Contains firmware files (`ITAIKO.uf2`) and version info.

## Development Workflow

### Prerequisites
*   Node.js (latest LTS recommended)
*   pnpm (package manager)

### Commands
*   **Start Dev Server:** `pnpm dev`
*   **Build for Production:** `pnpm build`
*   **Preview Build:** `pnpm preview`
*   **Lint:** `pnpm lint`

### Serial Protocol
The application communicates with the device using a text-based command protocol (115200 baud).
*   **1000-1004:** Configuration commands (Read, Save, Write Mode, Reload, Reboot).
*   **2000-2001:** Streaming commands (Start/Stop sensor data stream).
*   See `SERIAL_CONFIG.md` for the complete protocol specification.
