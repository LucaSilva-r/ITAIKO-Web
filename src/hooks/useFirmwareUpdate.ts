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
  }>;
}

export function useFirmwareUpdate(currentVersion?: string) {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [latestRelease, setLatestRelease] = useState<GithubRelease | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUpdate = useCallback(async () => {
    // Reset state if currentVersion is undefined or empty
    if (!currentVersion) {
      setIsUpdateAvailable(false);
      setLatestRelease(null);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('https://api.github.com/repos/LucaSilva-r/ITAIKO/releases/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch latest release');
      }
      const data: GithubRelease = await response.json();
      const latestVersion = data.tag_name;

      if (compareVersions(latestVersion, currentVersion) > 0) {
        setIsUpdateAvailable(true);
        setLatestRelease(data);
      } else {
        setIsUpdateAvailable(false);
      }
    } catch (err) {
      console.error('Error checking for firmware update:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsChecking(false);
    }
  }, [currentVersion]);

  // Automatically check when currentVersion changes and is defined
  useEffect(() => {
    if (currentVersion) {
      checkUpdate();
    }
  }, [currentVersion, checkUpdate]);

  return {
    isUpdateAvailable,
    latestRelease,
    isChecking,
    error,
    checkUpdate
  };
}
