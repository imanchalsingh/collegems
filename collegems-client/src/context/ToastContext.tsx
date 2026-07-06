import React, { createContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning" | "default";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: ToastAction;
}

interface ToastContextProps {
  toast: {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    warning: (message: string, options?: ToastOptions) => void;
    default: (message: string, options?: ToastOptions) => void;
  };
}

export const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = options?.duration ?? 4000;
    
    setToasts((prev) => [...prev, { 
      id, 
      type, 
      message, 
      duration,
      action: options?.action
    }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = {
    success: (msg: string, options?: ToastOptions) => addToast("success", msg, options),
    error: (msg: string, options?: ToastOptions) => addToast("error", msg, options),
    info: (msg: string, options?: ToastOptions) => addToast("info", msg, options),
    warning: (msg: string, options?: ToastOptions) => addToast("warning", msg, options),
    default: (msg: string, options?: ToastOptions) => addToast("default", msg, options),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";
          const isInfo = toast.type === "info";
          const isDefault = toast.type === "default";

          const bgClass = isError
            ? "bg-red-50 dark:bg-red-900/90 border-red-200 text-red-800 dark:text-red-100"
            : isSuccess
            ? "bg-green-50 dark:bg-green-900/90 border-green-200 text-green-800 dark:text-green-100"
            : isWarning
            ? "bg-amber-50 dark:bg-amber-900/90 border-amber-200 text-amber-800 dark:text-amber-100"
            : isInfo
            ? "bg-blue-50 dark:bg-blue-900/90 border-blue-200 text-blue-800 dark:text-blue-100"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100";

          const progressColor = isError ? "bg-red-500" : isSuccess ? "bg-green-500" : isWarning ? "bg-amber-500" : isInfo ? "bg-blue-500" : "bg-gray-500";

          return (
            <div
              key={toast.id}
              className={`group relative overflow-hidden flex flex-col min-w-[300px] w-full border rounded-xl shadow-xl transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto ${bgClass}`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="shrink-0 mt-0.5">
                  {isSuccess && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                  {isError && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                  {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                  {isInfo && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  {isDefault && <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />}
                </div>
                
                <div className="flex-1 flex flex-col gap-2">
                  <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
                  
                  {toast.action && (
                    <button
                      onClick={() => {
                        toast.action?.onClick();
                        removeToast(toast.id);
                      }}
                      className="self-start text-xs font-bold uppercase tracking-wider py-1 px-3 bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 rounded transition-colors"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 p-1 -mr-1 -mt-1 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {toast.duration > 0 && (
                <div className="h-1 w-full bg-black/5 dark:bg-white/10 absolute bottom-0 left-0">
                  <div 
                    className={`h-full ${progressColor}`}
                    style={{ 
                      animation: `shrink ${toast.duration}ms linear forwards`,
                      transformOrigin: "left"
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
