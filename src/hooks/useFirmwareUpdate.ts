import { useState, useCallback, useEffect } from 'react';
import { compareVersions } from '../lib/utils';

export interface GithubRelease {
  tag_name: string;
  html_url: string;
  name: string;
  body: string;
  assets: Array<{
    browser_download_url: string;
    name: string;
    url: string; // API URL for the asset
  }>;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'rebooting' | 'waiting_for_device' | 'flashing' | 'writing' | 'complete' | 'error' | 'manual_action_required';

export function useFirmwareUpdate(currentVersion?: string) {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [latestRelease, setLatestRelease] = useState<GithubRelease | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const checkUpdate = useCallback(async () => {
    // Reset state if currentVersion is undefined or empty
    if (!currentVersion) {
      setStatus('idle');
      setLatestRelease(null);
      return;
    }

    setStatus('checking');
    setError(null);

    try {
      const response = await fetch('https://api.github.com/repos/LucaSilva-r/ITAIKO/releases/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch latest release');
      }
      const data: GithubRelease = await response.json();
      const latestVersion = data.tag_name;

      if (compareVersions(latestVersion, currentVersion) > 0) {
        setStatus('available');
        setLatestRelease(data);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error checking for firmware update:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('idle');
    }
  }, [currentVersion]);

  // Automatically check when currentVersion changes and is defined
  useEffect(() => {
    if (currentVersion) {
      checkUpdate();
    }
  }, [currentVersion, checkUpdate]);

  const installUpdate = useCallback(async (rebootCallback: () => Promise<void>) => {
    if (!latestRelease) return;

    const asset = latestRelease.assets.find(a => a.name.endsWith('.uf2'));
    if (!asset) {
      setError('No firmware (.uf2) found in the release');
      return;
    }

    let blob: Blob | null = null;

    try {
      // 1. Download
      setStatus('downloading');
      setProgress(0);
      
      try {
        // Use CORS proxy to avoid CORS errors with GitHub releases
        const proxyUrl = `https://api.cors.lol/?url=${encodeURIComponent(asset.browser_download_url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        blob = await response.blob();
        setProgress(30);
      } catch (downloadErr) {
        console.warn('Automatic download via proxy failed, falling back to manual:', downloadErr);
        // Fallback: Continue flow but warn user they might need to drag-and-drop
        // actually, if we don't have the blob, we can't write it.
        // We will switch to a manual mode.
      }

      // 2. Reboot
      setStatus('rebooting');
      await rebootCallback();
      setProgress(50);

      // 3. Find Device (WebUSB confirmation)
      setStatus('waiting_for_device');
      
      try {
        await navigator.usb.requestDevice({ filters: [{ vendorId: 0x2E8A, productId: 0x0003 }] });
      } catch (e) {
        console.warn("Device selection cancelled or failed:", e);
        // We continue even if they cancelled, assuming they might have the drive ready anyway.
      }

      if (blob) {
        // 4a. Flash (Save File via File System Access API)
        setStatus('flashing');
        
        // @ts-expect-error - showSaveFilePicker is not in standard types yet
        const handle = await window.showSaveFilePicker({
          suggestedName: asset.name,
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
        // 4b. Manual Fallback
        setStatus('manual_action_required');
        window.open(asset.browser_download_url, '_blank');
      }
      
    } catch (err) {
      console.error('Update failed:', err);
      // If we are in manual mode, don't override the status
      if (status !== 'manual_action_required') {
        setError(err instanceof Error ? err.message : 'Update failed');
        setStatus('error');
      }
    }
  }, [latestRelease, status]);

  return {
    isUpdateAvailable: status === 'available',
    status,
    latestRelease,
    error,
    progress,
    checkUpdate,
    installUpdate
  };
}
