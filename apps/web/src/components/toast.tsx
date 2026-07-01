"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEDUPE_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const toast = useCallback((message: string, variant: ToastVariant = "default") => {
    const key = `${variant}:${message}`;
    const now = Date.now();
    const last = recentRef.current.get(key);
    if (last !== undefined && now - last < DEDUPE_MS) return;

    recentRef.current.set(key, now);
    for (const [k, ts] of recentRef.current) {
      if (now - ts > DEDUPE_MS) recentRef.current.delete(k);
    }

    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3500);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%,20rem)] flex-col-reverse gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`rounded-lg px-4 py-2.5 text-sm shadow-lg ${
              t.variant === "error"
                ? "bg-red-600 text-white"
                : t.variant === "success"
                  ? "bg-emerald-600 text-white"
                  : "border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)]"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
