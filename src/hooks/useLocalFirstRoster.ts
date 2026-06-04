import { useEffect, useState } from 'react';

// Define a key that isolates this local-first application workspace
const SHIFTWISE_CACHE_KEY = 'shiftwise_namibia_roster_cache';

export const useLocalFirstRoster = <T,>(initialRosterData: T) => {
  const [roster, setRoster] = useState<T>(() => {
    try {
      // 100% Private, offline data retrieval directly from local hardware sandbox
      const savedData = localStorage.getItem(SHIFTWISE_CACHE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error("Local cache extraction failed:", error);
    }
    return initialRosterData;
  });

  // Watch state changes and securely stream them into client-side cache
  useEffect(() => {
    try {
      if (roster && Object.keys(roster as object).length > 0) {
        localStorage.setItem(SHIFTWISE_CACHE_KEY, JSON.stringify(roster));
      }
    } catch (error) {
      console.error("Local caching sync execution blocked:", error);
    }
  }, [roster]);

  // Clean wipe trigger matching your absolute privacy mandate
  const clearSessionSecurely = () => {
    localStorage.removeItem(SHIFTWISE_CACHE_KEY);
    setRoster(initialRosterData);
  };

  return [roster, setRoster, clearSessionSecurely] as const;
};
