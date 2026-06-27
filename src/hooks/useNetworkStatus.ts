import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      setOnline(navigator.onLine);
    }
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
