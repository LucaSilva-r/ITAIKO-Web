import { useState, useCallback, useRef, type RefObject } from "react";
import type { ConnectionStatus, DeviceCommand } from "@/types";
import { PICO_VENDOR_ID, BAUD_RATE } from "@/types";
import { encodeCommand, decodeResponse } from "@/lib/serial-protocol";

interface UseWebSerialReturn {
  // State
  status: ConnectionStatus;
  error: string | null;
  isSupported: boolean;

  // Port management
  port: RefObject<SerialPort | null>;
  requestPort: () => Promise<SerialPort | null>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;

  // Communication
  sendCommand: (command: DeviceCommand, data?: string) => Promise<void>;
  readLine: () => Promise<string | null>;
  readUntilTimeout: (timeoutMs?: number) => Promise<string>;

  // Stream reading
  startReading: (onData: (line: string) => void) => void;
  stopReading: () => void;
  isReading: boolean;
}

export function useWebSerial(): UseWebSerialReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const port = useRef<SerialPort | null>(null);
  const [isReading, setIsReading] = useState(false);

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const bufferRef = useRef("");

  // Callback ref - allows swapping the callback without restarting the loop
  const onDataCallbackRef = useRef<((line: string) => void) | null>(null);
  const loopRunningRef = useRef(false);

  const isSupported = typeof navigator !== "undefined" && "serial" in navigator;

  // Internal function to start the read loop (called once on connect)
  const startReadLoop = useCallback(() => {
    if (loopRunningRef.current || !readerRef.current) {
      return;
    }

    loopRunningRef.current = true;

    const readLoop = async () => {
      while (loopRunningRef.current && readerRef.current) {
        try {
          const { value, done } = await readerRef.current.read();

          if (done || !loopRunningRef.current) {
            break;
          }

          bufferRef.current += decodeResponse(value);

          // Process all complete lines
          let newlineIndex: number;
          while ((newlineIndex = bufferRef.current.indexOf("\n")) !== -1) {
            const line = bufferRef.current.slice(0, newlineIndex).trim();
            bufferRef.current = bufferRef.current.slice(newlineIndex + 1);
            // Only call callback if one is set (streaming is active)
            if (line && onDataCallbackRef.current) {
              onDataCallbackRef.current(line);
            }
          }
        } catch (err) {
          if (loopRunningRef.current) {
            console.error("Read error:", err);
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
      setError("WebSerial is not supported in this browser");
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
      if (err instanceof Error && err.name !== "NotFoundError") {
        setError(err.message);
      }
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
        readerRef.current = port.current.readable.getReader();
        writerRef.current = port.current.writable.getWriter();
        setStatus("connected");

        // Start the read loop immediately on connect
        startReadLoop();

        return true;
      } else {
        throw new Error("Port streams not available");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setStatus("error");
      return false;
    }
  }, [port, startReadLoop]);

  const disconnect = useCallback(async (): Promise<void> => {
    // Stop the read loop
    loopRunningRef.current = false;
    onDataCallbackRef.current = null;
    setIsReading(false);

    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }

      if (writerRef.current) {
        writerRef.current.releaseLock();
        writerRef.current = null;
      }

      if (port.current) {
        await port.current.close();
      }
    } catch (err) {
      console.error("Error during disconnect:", err);
    }

    bufferRef.current = "";
    setStatus("disconnected");
    setError(null);
  }, [port]);

  const sendCommand = useCallback(
    async (command: DeviceCommand, data?: string): Promise<void> => {
      if (!writerRef.current) {
        throw new Error("Not connected");
      }

      let commandStr = `${command}\n`;
      if (data) {
        commandStr += `${data}\n`;
      }

      await writerRef.current.write(encodeCommand(commandStr));
    },
    []
  );

  const readLine = useCallback(async (): Promise<string | null> => {
    if (!readerRef.current) {
      return null;
    }

    // Check buffer first
    const newlineIndex = bufferRef.current.indexOf("\n");
    if (newlineIndex !== -1) {
      const line = bufferRef.current.slice(0, newlineIndex);
      bufferRef.current = bufferRef.current.slice(newlineIndex + 1);
      return line.trim();
    }

    // Read more data
    try {
      const { value, done } = await readerRef.current.read();
      if (done) {
        return null;
      }

      bufferRef.current += decodeResponse(value);

      // Check for newline again
      const idx = bufferRef.current.indexOf("\n");
      if (idx !== -1) {
        const line = bufferRef.current.slice(0, idx);
        bufferRef.current = bufferRef.current.slice(idx + 1);
        return line.trim();
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  const readUntilTimeout = useCallback(
    async (timeoutMs: number = 500): Promise<string> => {
      const startTime = Date.now();
      let result = "";

      while (Date.now() - startTime < timeoutMs) {
        const line = await readLine();
        if (line) {
          result += line + "\n";
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      return result;
    },
    [readLine]
  );

  // Start reading: just set the callback - the loop is already running
  const startReading = useCallback(
    (onData: (line: string) => void): void => {
      onDataCallbackRef.current = onData;
      setIsReading(true);

      // Restart loop if it stopped (e.g., due to an error)
      if (!loopRunningRef.current && readerRef.current) {
        startReadLoop();
      }
    },
    [startReadLoop]
  );

  // Stop reading: just clear the callback - the loop keeps running
  const stopReading = useCallback((): void => {
    onDataCallbackRef.current = null;
    setIsReading(false);
  }, []);

  return {
    status,
    error,
    isSupported,
    port,
    requestPort,
    connect,
    disconnect,
    sendCommand,
    readLine,
    readUntilTimeout,
    startReading,
    stopReading,
    isReading,
  };
}
