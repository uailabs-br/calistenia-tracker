"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastVariant = "info" | "success" | "error";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  /** ms até auto-dismiss. Padrão 4000; com ação, 5000. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Feedback efêmero (registro, undo, erro). Um toast por vez — o novo
 *  substitui o anterior para não empilhar durante o treino. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const timer = useRef<number | null>(null);
  const idRef = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clear();
    setCurrent(null);
  }, [clear]);

  const toast = useCallback(
    (opts: ToastOptions) => {
      clear();
      const id = ++idRef.current;
      setCurrent({ ...opts, id });
      const duration = opts.duration ?? (opts.action ? 5000 : 4000);
      timer.current = window.setTimeout(() => {
        setCurrent((c) => (c?.id === id ? null : c));
        timer.current = null;
      }, duration);
    },
    [clear]
  );

  useEffect(() => clear, [clear]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastHost item={current} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastHost({
  item,
  onDismiss,
}: {
  item: ToastItem | null;
  onDismiss: () => void;
}) {
  if (!item) return null;

  const accent =
    item.variant === "error"
      ? "var(--color-danger)"
      : item.variant === "success"
        ? "var(--color-success)"
        : "var(--color-text)";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + var(--nav-height) + 12px)",
      }}
      role="status"
      aria-live="polite"
    >
      <div
        key={item.id}
        className="anim-toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface2 px-4 py-3 shadow-lg"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-sm">{item.message}</span>
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="tap -mr-1 shrink-0 rounded-lg px-2 py-1 text-sm font-semibold"
            style={{ color: accent }}
          >
            {item.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fora do provider: no-op seguro (ex: testes, SSR).
    return { toast: () => {} };
  }
  return ctx;
}
