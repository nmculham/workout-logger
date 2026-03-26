import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setIsOnline(navigator.onLine);
      const onOnline = () => setIsOnline(true);
      const onOffline = () => setIsOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    let cleanup: (() => void) | undefined;

    (async () => {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      const handle = await Network.addListener('networkStatusChange', s => {
        setIsOnline(s.connected);
      });
      cleanup = () => handle.remove();
    })();

    return () => cleanup?.();
  }, []);

  return isOnline;
}
