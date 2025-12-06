import { useState, useCallback, useRef } from "react";
import type { ConnectionStatus, DeviceCommand } from "@/types";
import { PICO_VENDOR_ID, BAUD_RATE } from "@/types";
import { encodeCommand, decodeResponse } from "@/lib/serial-protocol";

interface UseWebSerialReturn {
  // State
  status: ConnectionStatus;
  error: string | null;
  isSupported: boolean;

  // Port management
  port: SerialPort | null;
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
  const [port, setPort] = useState<SerialPort | null>(null);
  const [isReading, setIsReading] = useState(false);

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const readingRef = useRef(false);
  const bufferRef = useRef("");

  const isSupported = typeof navigator !== "undefined" && "serial" in navigator;

  const requestPort = useCallback(async (): Promise<SerialPort | null> => {
    if (!isSupported) {
      setError("WebSerial is not supported in this browser");
      return null;
    }

    try {
      const selectedPort = await navigator.serial.requestPort({
        filters: [{ usbVendorId: PICO_VENDOR_ID }],
      });
      setPort(selectedPort);
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
    if (!port) {
      setError("No port selected");
      return false;
    }

    try {
      setStatus("connecting");
      setError(null);

      await port.open({ baudRate: BAUD_RATE });

      if (port.readable && port.writable) {
        readerRef.current = port.readable.getReader();
        writerRef.current = port.writable.getWriter();
        setStatus("connected");
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
  }, [port]);

  const disconnect = useCallback(async (): Promise<void> => {
    readingRef.current = false;
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

      if (port) {
        await port.close();
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

  const startReading = useCallback(
    (onData: (line: string) => void): void => {
      if (readingRef.current || !readerRef.current) {
        return;
      }

      readingRef.current = true;
      setIsReading(true);

      const readLoop = async () => {
        while (readingRef.current && readerRef.current) {
          try {
            const { value, done } = await readerRef.current.read();
            if (done) {
              break;
            }

            bufferRef.current += decodeResponse(value);

            // Process all complete lines
            let newlineIndex: number;
            while ((newlineIndex = bufferRef.current.indexOf("\n")) !== -1) {
              const line = bufferRef.current.slice(0, newlineIndex).trim();
              bufferRef.current = bufferRef.current.slice(newlineIndex + 1);
              if (line) {
                onData(line);
              }
            }
          } catch (err) {
            if (readingRef.current) {
              console.error("Read error:", err);
            }
            break;
          }
        }

        readingRef.current = false;
        setIsReading(false);
      };

      readLoop();
    },
    []
  );

  const stopReading = useCallback((): void => {
    readingRef.current = false;
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
