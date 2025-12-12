# Debugging URL Parameters

This document outlines various URL parameters that can be used for debugging and development purposes within the ITAIKO Web Configurator.

## Available Parameters

### `tab`

-   **Purpose:** Specifies which tab should be active by default when the `ConfigurePage` loads.
-   **Values:**
    -   `config`: Opens the "Configuration" tab.
    -   `monitor`: Opens the "Live Monitor" tab.
-   **Usage:** Append `?tab=config` or `?tab=monitor` to the application's URL.
-   **Example:** `http://localhost:5173/configure?tab=monitor`

### `tx`

-   **Purpose:** Enables verbose logging of all messages transmitted *from* the web application *to* the connected ITAIKO controller via the Web Serial API. These messages will appear in the browser's developer console.
-   **Values:**
    -   `true`: Activates transmission logging.
-   **Usage:** Append `?tx=true` to the application's URL.
-   **Example:** `http://localhost:5173/configure?tx=true`

### `rx`

-   **Purpose:** Enables verbose logging of all messages received *by* the web application *from* the connected ITAIKO controller via the Web Serial API. These messages will appear in the browser's developer console.
-   **Values:**
    -   `true`: Activates reception logging.
-   **Usage:** Append `?rx=true` to the application's URL.
-   **Example:** `http://localhost:5173/configure?rx=true`

### `update`

-   **Purpose:** Forces the firmware update prompt to appear in the application, even if the connected device's firmware version is up-to-date or cannot be determined. This is useful for testing the firmware update flow without needing an older firmware version.
-   **Values:**
    -   `true`: Forces the firmware update prompt.
-   **Usage:** Append `?update=true` to the application's URL.
-   **Example:** `http://localhost:5173/configure?update=true`

---

**Note:** These parameters are intended for debugging and development. They may not be officially supported features and their behavior could change in future versions.
