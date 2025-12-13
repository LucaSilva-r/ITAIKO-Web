import { useState, useCallback, useRef, type RefObject, useEffect } from "react";
import type { ConnectionStatus, DeviceCommand } from "@/types";
import { PICO_VENDOR_ID, BAUD_RATE } from "@/types";
import { encodeCommand } from "@/lib/serial-protocol";

interface UseWebSerialReturn {
  status: ConnectionStatus;
  error: string | null;
  isSupported: boolean;
  port: RefObject<SerialPort | null>;
  hasAuthorizedDevice: boolean;
  requestPort: () => Promise<SerialPort | null>;
  findAuthorizedPort: () => Promise<SerialPort | null>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCommand: (command: DeviceCommand, data?: string) => Promise<void>;
  sendBinary: (data: Uint8Array) => Promise<void>;
  readLine: () => Promise<string | null>;
  readUntilTimeout: (timeoutMs?: number) => Promise<string>;
  clearBuffer: () => void;
  startReading: (onData: (line: string) => void) => void;
  stopReading: () => void;
  isReading: boolean;
}

export function useWebSerial(): UseWebSerialReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const port = useRef<SerialPort | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [hasAuthorizedDevice, setHasAuthorizedDevice] = useState(false);

  // We use a ReadableStream reader that returns strings directly
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  
  // Keep the decoder in a ref so we can close it properly
  const decoderReadableStreamRef = useRef<ReadableStream<string> | null>(null);
  const inputDoneRef = useRef<Promise<void> | null>(null);

  const lineQueueRef = useRef<string[]>([]);
  const onDataCallbackRef = useRef<((line: string) => void) | null>(null);
  const loopRunningRef = useRef(false);

  const isSupported = typeof navigator !== "undefined" && "serial" in navigator;

  // Track if we're in the middle of a user-initiated disconnect
  const disconnectingRef = useRef(false);

  // Ref to track if component is mounted (for cleanup)
  const isMountedRef = useRef(true);

  // Check for authorized ports on mount and set up event listeners
  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupported) return;

    const checkAuthorizedPorts = async () => {
      if (!isMountedRef.current) return;

      try {
        const ports = await navigator.serial.getPorts();
        const authorized = ports.some(p => p.getInfo().usbVendorId === PICO_VENDOR_ID);
        setHasAuthorizedDevice(authorized);

        // Auto-connect if we found a port and aren't connected
        if (authorized && !port.current && status === 'disconnected') {
           const p = ports.find(p => p.getInfo().usbVendorId === PICO_VENDOR_ID);
           if (p) {
             port.current = p;
             connect();
           }
        }
      } catch (e) {
        console.error("Failed to check ports:", e);
      }
    };

    checkAuthorizedPorts();

    const handleConnect = () => {
       // When a device is connected, check if it's ours and try to connect
       checkAuthorizedPorts();
    };

    const handleDisconnect = () => {
       checkAuthorizedPorts();
    };

    navigator.serial.addEventListener('connect', handleConnect);
    navigator.serial.addEventListener('disconnect', handleDisconnect);

    return () => {
      isMountedRef.current = false;
      navigator.serial.removeEventListener('connect', handleConnect);
      navigator.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [isSupported]); // We intentionally leave 'connect' and 'status' out to avoid loops, as checkAuthorizedPorts handles the logic safely

  // Cleanup: disconnect when the hook unmounts
  useEffect(() => {
    return () => {
      // Disconnect serial port on unmount to prevent orphaned connections
      if (port.current) {
        disconnectingRef.current = true;
        loopRunningRef.current = false;
        onDataCallbackRef.current = null;

        const cleanup = async () => {
          try {
            if (readerRef.current) {
              await readerRef.current.cancel();
              readerRef.current.releaseLock();
              readerRef.current = null;
            }
            if (inputDoneRef.current) {
              await inputDoneRef.current.catch(() => {});
              inputDoneRef.current = null;
            }
            if (writerRef.current) {
              await writerRef.current.close().catch(() => {});
              writerRef.current.releaseLock();
              writerRef.current = null;
            }
            if (port.current) {
              await port.current.close();
            }
          } catch (err) {
            console.error("Cleanup disconnect error:", err);
          }
        };
        cleanup();
      }
    };
  }, []);

  const startReadLoop = useCallback(() => {
    if (loopRunningRef.current || !readerRef.current) return;

    loopRunningRef.current = true;

    const readLoop = async () => {
      let buffer = "";

      while (loopRunningRef.current && readerRef.current) {
        try {
          // Read already-decoded strings! No manual TextDecoder needed.
          const { value, done } = await readerRef.current.read();

          if (done) break;

          if (value) {
            buffer += value;
            let newlineIndex;
            // Process lines
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (line) {
                if (new URLSearchParams(window.location.search).get("rx") === "true") {
                  console.log(`[Serial RX] ${line}`);
                }

                if (onDataCallbackRef.current) {
                  onDataCallbackRef.current(line);
                } else {
                  lineQueueRef.current.push(line);
                  if (lineQueueRef.current.length > 1000) {
                    lineQueueRef.current.shift();
                  }
                }
              }
            }
          }
        } catch (err) {
          // Device was unplugged or lost - trigger disconnect if not already disconnecting
          if (!disconnectingRef.current) {
            console.error("Device lost:", err);
            loopRunningRef.current = false;
            onDataCallbackRef.current = null;
            setIsReading(false);
            decoderReadableStreamRef.current = null;
            inputDoneRef.current = null;
            readerRef.current = null;
            writerRef.current = null;
            lineQueueRef.current = [];
            setStatus("disconnected");
            setError("Device disconnected");
          }
          break;
        }
      }
      loopRunningRef.current = false;
    };

    readLoop();
  }, []);

  const requestPort = useCallback(async (): Promise<SerialPort | null> => {
    if (!isSupported) {
      setError("WebSerial is not supported");
      return null;
    }
    try {
      const selectedPort = await navigator.serial.requestPort({
        filters: [{ usbVendorId: PICO_VENDOR_ID }],
      });
      port.current = selectedPort;
      setError(null);
      return selectedPort;
    } catch (err) {
      if (err instanceof Error && err.name !== "NotFoundError") setError(err.message);
      return null;
    }
  }, [isSupported]);
  
  const findAuthorizedPort = useCallback(async (): Promise<SerialPort | null> => {
    if (!isSupported) return null;
    try {
      const ports = await navigator.serial.getPorts();
      const authorized = ports.find(p => {
        const info = p.getInfo();
        return info.usbVendorId === PICO_VENDOR_ID;
      });
      if (authorized) {
        port.current = authorized;
        return authorized;
      }
      return null;
    } catch (err) {
      console.error("Error finding authorized ports", err);
      return null;
    }
  }, [isSupported]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!port.current) {
      setError("No port selected");
      return false;
    }

    try {
      setStatus("connecting");
      setError(null);
      await port.current.open({ baudRate: BAUD_RATE });

      if (port.current.readable && port.current.writable) {
        // Create a text decoder stream to handle parsing efficiently
        const textDecoder = new TextDecoderStream();
        // Type assertion needed due to WebSerial/TextDecoderStream type mismatch
        inputDoneRef.current = port.current.readable.pipeTo(
          textDecoder.writable as WritableStream<Uint8Array>
        );
        decoderReadableStreamRef.current = textDecoder.readable;
        
        readerRef.current = textDecoder.readable.getReader();
        writerRef.current = port.current.writable.getWriter();
        
        setStatus("connected");
        startReadLoop();
        return true;
      } else {
        throw new Error("Port streams not available");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
      return false;
    }
  }, [port, startReadLoop]);

  const disconnect = useCallback(async (): Promise<void> => {
    // Mark that we're intentionally disconnecting (prevents read loop from setting error)
    disconnectingRef.current = true;
    loopRunningRef.current = false;
    onDataCallbackRef.current = null;
    setIsReading(false);

    try {
      // 1. Cancel the reader first - this will cause pipeTo to complete
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }

      // 2. Wait for the pipeTo to complete (it resolves/rejects when reader is canceled)
      if (inputDoneRef.current) {
        await inputDoneRef.current.catch(() => {});
        inputDoneRef.current = null;
      }

      // 3. Release writer lock
      if (writerRef.current) {
        await writerRef.current.close().catch(() => {});
        writerRef.current.releaseLock();
        writerRef.current = null;
      }

      // 4. Now we can safely close the port
      if (port.current) {
        await port.current.close();
      }
    } catch (err) {
      console.error("Error disconnect:", err);
    }

    decoderReadableStreamRef.current = null;
    lineQueueRef.current = [];
    disconnectingRef.current = false;
    setStatus("disconnected");
    setError(null);
  }, [port]);

  const sendCommand = useCallback(async (command: DeviceCommand, data?: string): Promise<void> => {
      if (!writerRef.current) throw new Error("Not connected");
      const cmdStr = data ? `${command}\n${data}\n` : `${command}\n`;
      if (new URLSearchParams(window.location.search).get("tx") === "true") {
        console.log(`[Serial TX] ${cmdStr.trim()}`);
      }
      await writerRef.current.write(encodeCommand(cmdStr));
    }, []);

  const sendBinary = useCallback(async (data: Uint8Array): Promise<void> => {
      if (!writerRef.current) throw new Error("Not connected");
      await writerRef.current.write(data);
  }, []);

  const readLine = useCallback(async (): Promise<string | null> => {
    if (lineQueueRef.current.length > 0) return lineQueueRef.current.shift() ?? null;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return lineQueueRef.current.shift() ?? null;
  }, []);

  const clearBuffer = useCallback(() => {
    lineQueueRef.current = [];
  }, []);

  const readUntilTimeout = useCallback(async (timeoutMs: number = 500): Promise<string> => {
      const start = Date.now();
      const lines: string[] = [];
      // Do not clear queue here to avoid race conditions with fast responses
      while (Date.now() - start < timeoutMs) {
        if (lineQueueRef.current.length) lines.push(lineQueueRef.current.shift()!);
        else await new Promise((r) => setTimeout(r, 10));
      }
      return lines.join("\n");
    }, []);

  const startReading = useCallback((onData: (line: string) => void): void => {
      lineQueueRef.current = [];
      onDataCallbackRef.current = onData;
      setIsReading(true);
      if (!loopRunningRef.current && readerRef.current) startReadLoop();
    }, [startReadLoop]);

  const stopReading = useCallback((): void => {
    onDataCallbackRef.current = null;
    setIsReading(false);
  }, []);

    return { status, error, isSupported, port, hasAuthorizedDevice, requestPort, findAuthorizedPort, connect, disconnect, sendCommand, sendBinary, readLine, readUntilTimeout, clearBuffer, startReading, stopReading, isReading };

  }

  