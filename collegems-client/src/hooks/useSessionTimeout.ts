import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'lastActivityTime';

export const useSessionTimeout = (
  timeoutMinutes = 30,
  warningMinutes = 5,
  onLogout: () => void
) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningMinutes * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateActivity = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    if (showWarning) {
      setShowWarning(false);
      setRemainingSeconds(warningMinutes * 60);
    }
  }, [showWarning, warningMinutes]);

  useEffect(() => {
    // Initialize storage if empty
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    // Also listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (showWarning) {
          setShowWarning(false);
          setRemainingSeconds(warningMinutes * 60);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const checkSession = () => {
      const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || Date.now().toString(), 10);
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const warningMs = warningMinutes * 60 * 1000;
      const timeToLogout = timeoutMs - inactiveTime;

      // Only act if user is logged in
      if (!localStorage.getItem('token')) {
        if (showWarning) setShowWarning(false);
        return;
      }

      if (timeToLogout <= 0) {
        onLogout();
      } else if (timeToLogout <= warningMs) {
        setShowWarning(true);
        setRemainingSeconds(Math.ceil(timeToLogout / 1000));
      } else {
        setShowWarning(false);
      }
    };

    timerRef.current = setInterval(checkSession, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      window.removeEventListener('storage', handleStorageChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeoutMinutes, warningMinutes, onLogout, showWarning, updateActivity]);

  const extendSession = () => {
    updateActivity();
  };

  return { showWarning, remainingSeconds, extendSession };
};
