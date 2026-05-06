import { useState, useCallback, useRef } from "react";

export function useToast() {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
    duration: 3000,
  });
  
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({
      visible: true,
      message,
      type,
      duration,
    });

    // Auto hide
    toastTimeoutRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  // Convenience methods
  const success = useCallback((message, duration) => {
    showToast(message, "success", duration);
  }, [showToast]);

  const error = useCallback((message, duration) => {
    showToast(message, "error", duration || 4000);
  }, [showToast]);

  const info = useCallback((message, duration) => {
    showToast(message, "info", duration);
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    showToast(message, "warning", duration);
  }, [showToast]);

  const loading = useCallback((message, duration) => {
    showToast(message, "loading", duration || 10000); 
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    info,
    warning,
    loading,
  };
}