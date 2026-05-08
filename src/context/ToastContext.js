import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import Toast from "../components/common/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
    duration: 3000,
  });

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
    });

    if (type !== "loading" && duration > 0) {
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, duration);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const success = useCallback((message, duration) => {
    showToast(message, "success", duration || 3000);
  }, [showToast]);

  const error = useCallback((message, duration) => {
    showToast(message, "error", duration || 4000);
  }, [showToast]);

  const info = useCallback((message, duration) => {
    showToast(message, "info", duration || 3000);
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    showToast(message, "warning", duration || 3000);
  }, [showToast]);

  const loading = useCallback((message, duration) => {
    showToast(message, "loading", duration || 10000);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ 
      toast, 
      showToast, 
      hideToast, 
      success, 
      error, 
      info, 
      warning, 
      loading 
    }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}