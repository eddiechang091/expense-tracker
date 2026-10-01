import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ToastMessage {
  id: string;
  text: string;
  tone: "default" | "error";
}

interface ToastContextValue {
  notify: (text: string, tone?: "default" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const notify = useCallback((text: string, tone: "default" | "error" = "default") => {
    counter.current += 1;
    const id = "t" + counter.current;
    setItems((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-layer" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={item.tone === "error" ? "toast error" : "toast"} role="status">
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { notify: () => undefined };
  return ctx;
}
