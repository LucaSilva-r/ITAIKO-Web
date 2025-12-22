import { useState, useCallback, useEffect, useMemo } from 'react';
import { compareVersions } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';

export interface FirmwareInfo {
  version: string;
  firmwareUrl: string;
  firmwareName: string;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'rebooting' | 'waiting_for_device' | 'flashing' | 'writing' | 'complete' | 'error' | 'manual_action_required';

export function useFirmwareUpdate(currentVersion?: string) {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [latestFirmware, setLatestFirmware] = useState<FirmwareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [searchParams] = useSearchParams();

  const forceUpdate = useMemo(() => searchParams.get('update') === 'true', [searchParams]);

  const checkUpdate = useCallback(async () => {
    // Reset state if currentVersion is undefined or empty
    if (!currentVersion) {
      setStatus('idle');
      setLatestFirmware(null);
      return;
    }

    setStatus('checking');
    setError(null);

    try {
      // Fetch version from local firmware folder
      const response = await fetch('/firmware/version.txt');
      if (!response.ok) {
        throw new Error('Failed to fetch firmware version');
      }
      const latestVersion = (await response.text()).trim();

      const firmwareInfo: FirmwareInfo = {
        version: latestVersion,
        firmwareUrl: '/firmware/ITAIKO.uf2',
        firmwareName: 'ITAIKO.uf2',
      };

      if (forceUpdate || compareVersions(latestVersion, currentVersion) > 0) {
        setStatus('available');
        setLatestFirmware(firmwareInfo);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error checking for firmware update:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('idle');
    }
  }, [currentVersion, forceUpdate]);

  // Automatically check when currentVersion changes and is defined, or when forceUpdate changes
  useEffect(() => {
    if (currentVersion) {
      checkUpdate();
    }
  }, [currentVersion, checkUpdate, forceUpdate]);

  const installUpdate = useCallback(async (rebootCallback: () => Promise<void>) => {
    if (!latestFirmware) return;

    let blob: Blob | null = null;

    try {
      // 1. Download from local firmware folder
      setStatus('downloading');
      setProgress(0);

      const response = await fetch(latestFirmware.firmwareUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      blob = await response.blob();
      setProgress(30);

      // 2. Reboot
      setStatus('rebooting');
      await rebootCallback();
      setProgress(50);

      // 3. Wait for the device to reboot into bootloader mode
      setStatus('waiting_for_device');

      // Wait for the device to fully reboot into bootloader mode
      // The RP2040 bootloader appears as USB Mass Storage (RPI-RP2 drive), not WebUSB
      // We wait a fixed time to ensure the device has completed the reboot
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. Flash (Save File via File System Access API)
      setStatus('flashing');

      // Check if File System Access API is supported (Chromium)
      if ('showSaveFilePicker' in window) {
        // @ts-expect-error - showSaveFilePicker is not in standard types yet
        const handle = await window.showSaveFilePicker({
          suggestedName: latestFirmware.firmwareName,
          types: [{
            description: 'UF2 Firmware',
            accept: { 'application/x-uf2': ['.uf2'] },
          }],
        });

        // 5. Write to device
        setStatus('writing');
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        setProgress(100);
        setStatus('complete');
      } else {
        // Fallback for Firefox / others: Manual download
        setStatus('manual_action_required');
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = latestFirmware.firmwareName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

    } catch (err) {
      console.error('Update failed:', err);
      setError(err instanceof Error ? err.message : 'Update failed');
      setStatus('error');
    }
  }, [latestFirmware]);

  return {
    isUpdateAvailable: status === 'available',
    status,
    latestFirmware,
    error,
    progress,
    checkUpdate,
    installUpdate
  };
}
