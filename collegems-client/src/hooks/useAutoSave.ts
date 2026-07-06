import { useEffect, useState } from 'react';

export function useAutoSave(key: string, value: any, setValue: Function) {
  // We use this state to lock the saving mechanism until the load is 100% finished
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // 1. Initial Load (Runs only when the assignment/comment section is opened)
  useEffect(() => {
    if (!key) return;

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Safely set the value whether it is an object (assignments) or string (comments)
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          setValue((prev: any) => ({ ...prev, ...parsed }));
        } else {
          setValue(parsed);
        }
      } catch (e) {
        console.error("AutoSave load error", e);
      }
    }
    setLoadedKey(key);
  }, [key, setValue]);

  // 2. Save to Storage (Runs on every keystroke)
  useEffect(() => {
    if (!key) return;
    if (loadedKey !== key) {
      return; 
    }

    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, loadedKey]);
}