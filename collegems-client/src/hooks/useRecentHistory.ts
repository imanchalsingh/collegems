import { useEffect } from "react";
import { addRecentHistory } from "../api/history";

export const useRecentHistory = (entityType: string, entityId: string, displayName: string, url: string) => {
  useEffect(() => {
    if (entityType && entityId && displayName && url) {
      addRecentHistory({ entityType, entityId, displayName, url }).catch(console.error);
    }
  }, [entityType, entityId, displayName, url]);
};
