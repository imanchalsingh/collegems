import { useEffect, useRef } from "react";
import api from "../api/axios";

export interface FormTrackerOptions {
  formId: string;
}

/**
 * Hook to track form abandonment and completion.
 * @param options - Configuration including the formId
 * @returns { trackField, markSubmitted }
 */
export default function useFormTracker({ formId }: FormTrackerOptions) {
  const sessionIdRef = useRef<string | null>(null);
  const isSubmittedRef = useRef(false);
  const completedFieldsRef = useRef<Set<string>>(new Set());
  // Total fields could be set if known, but we'll approximate completion based on tracked fields
  // For simplicity, we just track the last completed field and completion percentage.
  
  // Track total expected fields if we want percentage (can be set manually or discovered)
  const totalFieldsRef = useRef(0);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await api.post("/abandonment/start", { formId });
        sessionIdRef.current = res.data.sessionId;
      } catch (err) {
        console.error("Failed to start form tracking session:", err);
      }
    };
    initSession();

    // Setup beforeunload to catch browser close/refresh
    const handleBeforeUnload = () => {
      if (!isSubmittedRef.current && sessionIdRef.current) {
        // Use sendBeacon or synchronous XHR for reliability during unload if needed,
        // but simple fetch with keepalive is best practice now.
        fetch(`${import.meta.env.VITE_BACKEND_URL}/abandonment/update/${sessionIdRef.current}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // Provide a dummy token if possible, though unload is tricky for auth. 
            // In a real app, sendBeacon is better but harder with JWT.
          },
          body: JSON.stringify({ status: "abandoned" }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup when component unmounts (e.g. user navigates away)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (!isSubmittedRef.current && sessionIdRef.current) {
        // We do a regular API call since it's just a SPA navigation
        api.put(`/abandonment/update/${sessionIdRef.current}`, {
          status: "abandoned",
        }).catch(() => {});
      }
    };
  }, [formId]);

  /**
   * Track completion of a field. Call this on field blur or change.
   * @param fieldName - Name of the field
   * @param totalExpectedFields - Optional. Total fields in the form to calculate completion %
   */
  const trackField = async (fieldName: string, totalExpectedFields: number = 0) => {
    if (isSubmittedRef.current || !sessionIdRef.current) return;

    completedFieldsRef.current.add(fieldName);
    if (totalExpectedFields > 0) totalFieldsRef.current = totalExpectedFields;

    let percentage = 0;
    if (totalFieldsRef.current > 0) {
      percentage = Math.round((completedFieldsRef.current.size / totalFieldsRef.current) * 100);
    }

    try {
      await api.put(`/abandonment/update/${sessionIdRef.current}`, {
        lastCompletedField: fieldName,
        completionPercentage: percentage,
      });
    } catch (err) {
      console.error("Failed to update form tracking session:", err);
    }
  };

  /**
   * Call this when the form is successfully submitted.
   */
  const markSubmitted = async () => {
    isSubmittedRef.current = true;
    if (sessionIdRef.current) {
      try {
        await api.put(`/abandonment/submit/${sessionIdRef.current}`, {});
      } catch (err) {
        console.error("Failed to submit form tracking session:", err);
      }
    }
  };

  return { trackField, markSubmitted };
}
