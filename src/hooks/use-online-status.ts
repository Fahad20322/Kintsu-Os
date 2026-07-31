"use client";

import * as React from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the actual browser connectivity state on mount, not a render-time derivation
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
